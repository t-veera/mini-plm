"""Scan a markdown document: walk its lines, understand its tables, pull out the node
IDs it *declares*.

A document declares a node when an ID sits at the head of a line (heading, bullet,
bold run, table row) -- that is how engineers write these docs. An ID appearing
mid-sentence is a *reference*, not a declaration, and belongs to links.py.

This module owns all markdown scanning; links.py consumes the Line records it yields
so table structure is parsed exactly once.
"""
import re
from collections import namedtuple

# Prefixes are an explicit allow-list rather than "any capitals + digits", which would
# happily match part numbers. The digits must follow the letters immediately, so real
# hardware tokens in these docs — GPIO15, ESP32, TP4056, UC8179, SPI2 — cannot match:
# their letter runs are longer than any listed prefix. `V` is deliberately absent
# because V1/V2 version markers are everywhere in product docs.
# Longest-first so RSK-04 matches RSK and not a bare R.
ID_PREFIXES = [
    'BLOCK', 'IFACE', 'VERIF', 'RISK', 'TEST', 'ARCH', 'PRD', 'REQ', 'RSK', 'HAZ',
    'SRS', 'ARC', 'VER', 'VAL', 'TST', 'TC', 'SR', 'OQ', 'R', 'T', 'G',
]

# Prefixes that only count when a hyphen and a two-digit-or-longer number follow.
# `FR4` is PCB laminate and `AC` is a supply rail — both appear in these documents in
# their ordinary engineering sense, so the glued form (FR4, AC12) and the single-digit
# form (FR-4) must not index. `FR-014` and `FR-I2-014` still do.
HYPHENATED_ID_PREFIXES = ['NFR', 'FR', 'AC']

# Three ID shapes exist in the wild and all three must index:
#
#   RSK-101         flat            legacy, pre-dates iteration markers
#   FR-I2-014       iteration       the current standard (PRD/ARCH/SRS)
#   T01             glued           legacy spreadsheet template
#
# plus the subsystem form (PRD-SYS-09, BLOCK-ELE-01) already in use.
#
# The iteration segment demands a hyphen on BOTH sides of its number. That is the whole
# defence against the hardware tokens these documents are full of: `AC-DC12` would
# otherwise read as an AC id, and every -I2- style tag would need the segment loosened
# far enough to swallow it. Everything else stays anchored on a digit run immediately
# after the prefix, which is what keeps GPIO45, TP4056, AO3401, MT3608, TP1-TP31,
# RT9193-33, UC8179 and GDEQ0583T31 unmatched.
_ITER_SEGMENT = r'-[A-Z]{1,3}\d{1,2}-\d{1,4}'   # -I2-014, -S1-002
_SUB_SEGMENT = r'-[A-Z]{2,5}-?\d{1,4}'          # -SYS-09, -ELE01
_FLAT_SEGMENT = r'-?\d{1,4}'                    # -101, 001, 01
_STRICT_FLAT_SEGMENT = r'-\d{2,4}'              # -014, never -4 and never 4
_STRICT_SUB_SEGMENT = r'-[A-Z]{2,5}-\d{1,4}'    # -SYS-09; the glued -SYS09 is what
#                                                 lets `AC-DC12` read as an id, so the
#                                                 hyphen-only prefixes don't get it

DEFAULT_ID_PATTERN = (
    r'\b(?:'
    r'(?:' + '|'.join(ID_PREFIXES) + r')'
    r'(?:' + _ITER_SEGMENT + r'|' + _SUB_SEGMENT + r'|' + _FLAT_SEGMENT + r')'
    r'|'
    r'(?:' + '|'.join(HYPHENATED_ID_PREFIXES) + r')'
    r'(?:' + _ITER_SEGMENT + r'|' + _STRICT_SUB_SEGMENT + r'|' + _STRICT_FLAT_SEGMENT + r')'
    r')\b'
)

# A tag whose prefix names its own kind wins over the file it sits in. This is what lets
# a risk register (RSK-01..) live inside a PRD and still index as RISK — docs in the wild
# rarely keep one doc type per file. A prefix that is absent here inherits the file's
# type, which is why R001/REQ-01 stay whatever their document is.
PREFIX_NODE_TYPES = {
    'ARCH': 'ARCH', 'ARC': 'ARCH',
    'RISK': 'RISK', 'RSK': 'RISK', 'HAZ': 'RISK',
    'SRS': 'SRS', 'SR': 'SRS',
    'TC': 'VERIF', 'TEST': 'VERIF', 'TST': 'VERIF', 'VER': 'VERIF', 'VERIF': 'VERIF',
    'T': 'VERIF',
    'VAL': 'VAL',
}

_PREFIX_RE = re.compile(r'^([A-Z]+)')


def node_type_for_tag(tag_id, file_node_type):
    """The node type a tag belongs to: its prefix's kind, else the document's kind."""
    match = _PREFIX_RE.match((tag_id or '').upper())
    if not match:
        return file_node_type
    return PREFIX_NODE_TYPES.get(match.group(1), file_node_type)

# A table row is a body row; `headers` are lowercased. None for non-table lines.
TableRow = namedtuple('TableRow', 'headers cells')
Line = namedtuple('Line', 'number text heading table')

DeclaredNode = namedtuple('DeclaredNode', 'tag_id title source_line snippet test_status subsystem')

_SEPARATOR_RE = re.compile(r'^\|[\s:\-|]+\|?\s*$')
# Bullets, numbering, blockquote marks, bold/italic/code runs: all noise in front of an ID.
_LEADING_NOISE_RE = re.compile(r'^[\s>#]*(?:[-*+•]\s*)?(?:\d+[.)]\s+)?[*_`]{0,3}\s*')
_TRAILING_NOISE_RE = re.compile(r'^[\s:\-–—.)*_`]+')
_MARKDOWN_CHARS_RE = re.compile(r'[*_`]')

_PASS_RE = re.compile(r'\b(?:pass|passed|passing)\b|✅|✔', re.I)
_FAIL_RE = re.compile(r'\b(?:fail|failed|failing)\b|❌|✗', re.I)
_INLINE_SUBSYSTEM_RE = re.compile(r'\bsubsystem\s*[:=]\s*([^|,;.]{1,60})', re.I)

_SNIPPET_MAX = 200

_ID_HEADER_RE = re.compile(r'\b(id|tag|ref)\b')
_TITLE_HEADER_RE = re.compile(
    r'\b(title|description|requirement|statement|name|summary|item|test|hazard|block)\b')
# Tiered like the subsystem matchers: an explicit outcome column beats a loose one. The
# trap this exists for is `Pass Criteria`, which contains `pass` but holds the prose
# description of the test -- reading it as the result turns "must not fail" into a FAIL.
_STATUS_HEADER_RES = (
    re.compile(r'\b(status|verdict|outcome)\b'),
    re.compile(r'\b(result|pass|fail)\b'),
)
# Headers that describe the test rather than record its outcome. Never a status column.
_NOT_STATUS_HEADER_RE = re.compile(
    r'\b(criteri\w*|expected|method|condition|precondition|step|steps|note|notes)\b')
# Tiered: an explicit "Subsystem" column always beats a loose synonym like "Block",
# whichever order they appear in.
_SUBSYSTEM_HEADER_RES = (
    re.compile(r'\bsub[-_ ]?system\b'),
    re.compile(r'\b(module|block|component|area|domain)\b'),
)


def compile_id_pattern(pattern=None):
    """Compile the node-ID regex. Pass a custom pattern to support other ID schemes."""
    return re.compile(pattern or DEFAULT_ID_PATTERN)


def canonical(tag_id):
    """Fold an ID to its matching key: uppercase, no separators, no leading zeros.

    R001, R-001 and r1 are the same requirement to an engineer, so they must be the
    same node to us. The as-written form is kept on TraceNode.tag_id for display.
    """
    if not tag_id:
        return ''
    folded = re.sub(r'[\s\-_.]', '', tag_id).upper()
    match = re.match(r'^([A-Z]+)0*(\d+)$', folded)
    if match:
        return f"{match.group(1)}{match.group(2)}"
    return folded


def iter_lines(text):
    """Yield Line records, resolving headings and markdown table structure.

    Table header rows and their `|---|` separators are consumed rather than yielded, so
    a heading cell can never be mistaken for a declaration.
    """
    lines = text.splitlines()
    total = len(lines)
    heading = ''
    headers = None
    index = 0

    while index < total:
        stripped = lines[index].strip()
        number = index + 1

        if stripped.startswith('#'):
            heading = stripped.lstrip('#').strip()
            headers = None
            yield Line(number, heading, heading, None)
            index += 1
            continue

        if stripped.startswith('|'):
            following = lines[index + 1].strip() if index + 1 < total else ''
            if _SEPARATOR_RE.match(following):
                headers = [cell.lower() for cell in _split_cells(stripped)]
                index += 2
                continue
            if _SEPARATOR_RE.match(stripped):
                index += 1
                continue
            cells = _split_cells(stripped)
            table = TableRow(headers, cells) if headers is not None else None
            yield Line(number, ' '.join(cells).strip(), heading, table)
            index += 1
            continue

        if not stripped:
            headers = None
        yield Line(number, stripped, heading, None)
        index += 1


def declared_node(line, id_re):
    """Return a DeclaredNode if this line declares an ID, else None."""
    if line.table is not None:
        return _declared_in_row(line, id_re)
    return _declared_in_text(line, id_re)


def read_test_status(text):
    """PASS / FAIL / None from a fragment of text."""
    if not text:
        return None
    if _FAIL_RE.search(text):
        return 'FAIL'
    if _PASS_RE.search(text):
        return 'PASS'
    return None


def _split_cells(row):
    stripped = row.strip()
    if stripped.startswith('|'):
        stripped = stripped[1:]
    if stripped.endswith('|'):
        stripped = stripped[:-1]
    return [cell.strip() for cell in stripped.split('|')]


def find_column(headers, *matchers, **kwargs):
    """Index of the first header cell matching a `matchers` entry, or None.

    Matchers are tried in order across all headers, so an earlier (more specific)
    pattern wins over a later one regardless of column order. `exclude` skips columns
    already claimed by another field.
    """
    exclude = kwargs.get('exclude') or ()
    if not headers:
        return None
    for matcher in matchers:
        for index, header in enumerate(headers):
            if index not in exclude and matcher.search(header):
                return index
    return None


def find_columns(headers, *matchers, **kwargs):
    """Every header index matching any `matchers` entry, in header order.

    The plural of find_column, for fields that legitimately repeat: a protocol sheet
    carries one status column per run ("Run 1 Status", "Run 2 Status").
    """
    exclude = kwargs.get('exclude') or ()
    if not headers:
        return []
    return [index for index, header in enumerate(headers)
            if index not in exclude and any(matcher.search(header) for matcher in matchers)]


def _status_columns(headers):
    prose = {index for index, header in enumerate(headers or ())
             if _NOT_STATUS_HEADER_RE.search(header)}
    return find_columns(headers, *_STATUS_HEADER_RES, exclude=prose)


def _status_cell(columns, cells):
    """The recorded outcome for this row: the LAST run that has anything in it.

    Re-running a protocol appends a column rather than overwriting one, so the rightmost
    filled status is the current verdict; an earlier PASS must not outrank a later FAIL.
    """
    for index in reversed(columns):
        cell = _cell(cells, index)
        if cell:
            return cell
    return ''


def _cell(cells, index):
    if index is None or index >= len(cells):
        return ''
    return cells[index]


def _declared_in_row(line, id_re):
    headers, cells = line.table.headers, line.table.cells
    if not cells:
        return None

    id_column = find_column(headers, _ID_HEADER_RE)
    if id_column is None:
        id_column = 0
    # Anchored at the head of the cell, exactly as a declaration in running text is.
    # Protocol sheets put section banners in the ID column ("INPUT — audit T08 before
    # running this section"); a mid-cell search reads that as declaring T08, which then
    # wins over T08's real row and takes the banner's text as its title.
    id_cell = _LEADING_NOISE_RE.sub('', _cell(cells, id_column))
    match = id_re.match(id_cell)
    if not match:
        return None

    status_columns = _status_columns(headers)
    title_column = find_column(headers, _TITLE_HEADER_RE, exclude={id_column})
    # A column already serving as the title cannot double as the subsystem.
    subsystem_column = find_column(headers, *_SUBSYSTEM_HEADER_RES,
                                   exclude={id_column, title_column})

    tag_id = match.group(0)
    title = _cell(cells, title_column)
    if not title:
        title = _first_prose_cell(cells, id_re, set(status_columns) | {id_column, subsystem_column})
    if not title:
        # Nothing else to go on: whatever follows the ID in its own cell, else the heading.
        title = _strip_markdown(_TRAILING_NOISE_RE.sub('', id_cell[match.end():]))
    if not title:
        title = line.heading

    status_cell = _status_cell(status_columns, cells)
    if status_cell:
        test_status = read_test_status(status_cell)
    elif status_columns:
        # The table has a result column and this row's is blank: the test has not been
        # run. Scanning the rest of the row here would read the word "fail" out of a
        # "Pass Criteria" sentence and report a failure nobody recorded.
        test_status = None
    else:
        test_status = read_test_status(line.text)

    subsystem = _cell(cells, subsystem_column) or None

    return DeclaredNode(
        tag_id=tag_id,
        title=_clip(_strip_markdown(title)),
        source_line=line.number,
        snippet=_clip(line.text, _SNIPPET_MAX),
        test_status=test_status,
        subsystem=_clip(subsystem, 120) if subsystem else None,
    )


def _first_prose_cell(cells, id_re, skip):
    """First cell that reads like a title rather than a list of IDs.

    Tables in the wild label their title column anything ('Hazard', 'Test', 'Item'), so
    when the header lookup misses, fall back to position: the first cell that is not the
    ID/status/subsystem column and is not simply a run of trace IDs.
    """
    for index, cell in enumerate(cells):
        if index in skip or not cell:
            continue
        if not _MARKDOWN_CHARS_RE.sub('', id_re.sub('', cell)).strip(' ,;/&'):
            continue  # nothing left once the IDs are removed: it's a link column
        return cell
    return ''


def _declared_in_text(line, id_re):
    if not line.text:
        return None
    head = _LEADING_NOISE_RE.sub('', line.text)
    match = id_re.match(head)
    if not match:
        return None

    tag_id = match.group(0)
    title = _strip_markdown(_TRAILING_NOISE_RE.sub('', head[match.end():])) or line.heading
    subsystem_match = _INLINE_SUBSYSTEM_RE.search(line.text)

    return DeclaredNode(
        tag_id=tag_id,
        title=_clip(title),
        source_line=line.number,
        snippet=_clip(line.text, _SNIPPET_MAX),
        test_status=read_test_status(line.text),
        subsystem=_clip(subsystem_match.group(1).strip(), 120) if subsystem_match else None,
    )


def _strip_markdown(text):
    return _MARKDOWN_CHARS_RE.sub('', text or '').strip()


def _clip(text, limit=500):
    text = (text or '').strip()
    return text if len(text) <= limit else text[:limit - 1].rstrip() + '…'
