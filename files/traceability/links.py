"""Read the references engineers already write. No new syntax is introduced.

Two forms are understood:
  1. inline mentions -- "satisfies R001", "traces to PRD-3", "mitigates RISK-04"
  2. a "traces to" / "parent" column in a markdown table

Both mean the same thing: the referenced ID is the parent, the node declared on (or
most recently before) that line is the child. Direction is always upstream -> local,
which is what makes "TC-09 verifies SRS-12" and "SRS-12 mitigates RISK-04" both come
out pointing the right way.
"""
import re

from .extract import canonical, find_column

# Verbs that mean "the thing I am about to name is upstream of me".
LINK_KEYWORDS = (
    r'satisf(?:y|ies|ied)|trace[sd]?\s+to|trace\s+to|deriv(?:e|es|ed)\s+from|'
    r'mitigat(?:e|es|ed)|address(?:es|ed)?|verif(?:y|ies|ied)|validat(?:e|es|ed)|'
    r'implement(?:s|ed)?|cover(?:s|ed)?|test(?:s|ed)?|refine(?:s|d)?|'
    r'fulfill?(?:s|ed)?|parent(?:\s+of)?|upstream'
)

_KEYWORD_RE = re.compile(LINK_KEYWORDS, re.I)
# Keyword, then the run of text it governs -- stopped at a sentence break so a
# reference cannot leak across clauses.
_MENTION_RE = re.compile(r'(?:' + LINK_KEYWORDS + r')\s*:?\s*([^.;\n]{0,120})', re.I)

_PARENT_HEADER_RE = re.compile(r'traces?\s*to|parent|upstream|satisfies|derived\s*from|source')


def references(line, id_re):
    """Canonical parent IDs referenced by this line (table column first, then inline)."""
    found = []
    if line.table is not None:
        found.extend(_column_references(line, id_re))
    found.extend(_inline_references(line.text, id_re))

    seen = set()
    ordered = []
    for tag in found:
        if tag and tag not in seen:
            seen.add(tag)
            ordered.append(tag)
    return ordered


def _column_references(line, id_re):
    headers, cells = line.table.headers, line.table.cells
    column = find_column(headers, _PARENT_HEADER_RE)
    if column is None or column >= len(cells):
        return []
    return [canonical(match.group(0)) for match in id_re.finditer(cells[column])]


def _inline_references(text, id_re):
    if not text:
        return []
    found = []
    for match in _MENTION_RE.finditer(text):
        chunk = match.group(1)
        # A second keyword starts a new clause ("satisfies R001 and is verified by
        # TC-09") -- everything past it belongs to that clause, not this one.
        next_keyword = _KEYWORD_RE.search(chunk)
        if next_keyword:
            chunk = chunk[:next_keyword.start()]
        found.extend(canonical(m.group(0)) for m in id_re.finditer(chunk))
    return found
