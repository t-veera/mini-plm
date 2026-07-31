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
    'VERIF', 'RISK', 'TEST', 'ARCH', 'PRD', 'REQ', 'RSK', 'HAZ', 'SRS', 'ARC',
    'VER', 'VAL', 'TST', 'TC', 'SR', 'OQ', 'R', 'T', 'G',
]

DEFAULT_ID_PATTERN = r'\b(?:' + '|'.join(ID_PREFIXES) + r')-?\d{1,4}\b'

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
_STATUS_HEADER_RE = re.compile(r'\b(status|result|outcome|pass|verdict)\b')
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
    match = id_re.search(_cell(cells, id_column))
    if not match:
        return None

    status_column = find_column(headers, _STATUS_HEADER_RE)
    title_column = find_column(headers, _TITLE_HEADER_RE)
    # A column already serving as the title cannot double as the subsystem.
    subsystem_column = find_column(headers, *_SUBSYSTEM_HEADER_RES,
                                   exclude={id_column, status_column, title_column})

    tag_id = match.group(0)
    title = _cell(cells, title_column)
    if not title:
        title = _first_prose_cell(cells, id_re, {id_column, status_column, subsystem_column})
    if not title:
        # Nothing else to go on: whatever follows the ID in its own cell, else the heading.
        title = _strip_markdown(_TRAILING_NOISE_RE.sub('', _cell(cells, id_column)[match.end():]))
    if not title:
        title = line.heading

    status_cell = _cell(cells, status_column)
    test_status = read_test_status(status_cell) if status_cell else read_test_status(line.text)

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
