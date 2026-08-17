"""Map a filename to a traceability document type.

Detection is on the filename only -- engineers name these docs consistently, and reading
file contents to guess would produce surprises. Matching is by KEYWORD, not by position:
real projects prefix these files with an ordering number that does not track document
type (`2_INKFRAME-SRS-I2-001.md` is logically the fourth document), and every team
numbers differently. Only the keyword is stable.

Three outcomes, all of them normal:
    MATCHED     a type was recognised -- index the file
    EXCLUDED    a known non-traceability document (scope, bench data, gate record) --
                store and display it, index nothing, say nothing
    UNMATCHED   nothing recognised -- index nothing, but log it, because a doc the user
                expected in the matrix silently vanishing is the failure mode here
    AMBIGUOUS   two different types matched -- refuse to guess (see classify())
"""
import os
import re
from collections import namedtuple

MATCHED = 'matched'
EXCLUDED = 'excluded'
UNMATCHED = 'unmatched'
AMBIGUOUS = 'ambiguous'

# Documents that upload, store and preview normally but never reach the parser.
# SCOPE is a planning document with no IDs; BENCH is raw hardware bench data keyed by
# test-point label rather than by ID; gate records are meeting minutes. All three used to
# fall out as "unrecognised" by accident -- listing them makes the exclusion deliberate,
# and keeps them out of the unmatched warning that would otherwise cry wolf every upload.
EXCLUDED_KEYWORDS = ('SCOPE', 'BENCH', 'GATE_REVIEW', 'GATE REVIEW')

# Keyword -> type. Substring match on the filename, case-insensitive.
#
# Short abbreviations are the whole risk here: a bare `VER` substring would claim
# `PRD_Version2.md` and `Design_Overview.md`, and `TEST` would claim `latest_notes.md`.
# So an entry may carry a boundary rule:
#   'word'   the keyword must not be glued to letters on either side (VER, VAL)
#   'start'  it must not have a letter before it (TEST/TST, so TESTS and TESTING still
#            match but LATEST does not)
#   None     plain substring; the keyword is long enough to stand alone
DOCTYPE_KEYWORDS = (
    ('PRD', 'PRD', None),
    ('PRD', 'PRODUCT REQUIREMENT', None),
    ('PRD', 'PRODUCT_REQUIREMENT', None),

    ('ARCH', 'ARCH', None),                    # covers SYS_ARCH and ARCHITECTURE too
    ('ARCH', 'SYSTEM ARCHITECTURE', None),

    ('RISK', 'RISK', None),
    ('RISK', 'FMEA', None),
    ('RISK', 'HAZARD', None),

    ('SRS', 'SRS', None),
    ('SRS', 'SPEC', None),
    ('SRS', 'REQUIREMENT', None),

    ('VERIF', 'VERIFICATION', None),
    ('VERIF', 'VERIF', None),
    ('VERIF', 'ACCEPTANCE', None),
    ('VERIF', 'VER', 'word'),
    ('VERIF', 'TST', 'start'),
    ('VERIF', 'TEST', 'start'),

    ('VAL', 'VALIDATION', None),
    ('VAL', 'VAL', 'word'),
)

# SRS keywords that any other document type may legitimately also contain (see classify).
GENERIC_SRS_KEYWORDS = ('SPEC', 'REQUIREMENT')

Classification = namedtuple('Classification', 'node_type outcome matched candidates')


def _compile(keyword, boundary):
    escaped = re.escape(keyword)
    if boundary == 'word':
        return re.compile(r'(?<![A-Z])' + escaped + r'(?![A-Z])', re.I)
    if boundary == 'start':
        return re.compile(r'(?<![A-Z])' + escaped, re.I)
    return re.compile(escaped, re.I)


_COMPILED = [(node_type, keyword, _compile(keyword, boundary))
             for node_type, keyword, boundary in DOCTYPE_KEYWORDS]
_EXCLUDED = [(keyword, _compile(keyword, None)) for keyword in EXCLUDED_KEYWORDS]


def classify(filename):
    """Full detection result for `filename`: a Classification.

    `node_type` is the resolved type, or None for every outcome but MATCHED. `matched` is
    the keyword that decided it (or the exclusion keyword); `candidates` lists every type
    that matched, which is what an AMBIGUOUS result exists to report.
    """
    if not filename:
        return Classification(None, UNMATCHED, None, ())

    stem = os.path.splitext(os.path.basename(filename))[0]

    for keyword, pattern in _EXCLUDED:
        if pattern.search(stem):
            return Classification(None, EXCLUDED, keyword, ())

    hits = {}
    for node_type, keyword, pattern in _COMPILED:
        if pattern.search(stem) and node_type not in hits:
            hits[node_type] = keyword

    # `spec` and `requirement` are the two words every other document type also uses --
    # `verification_spec.md`, `PRD_Requirements.md`, `Architecture_Spec.md`. They only
    # mean SRS when nothing more specific is present, which is the same precedence the
    # ordered-pattern list used to encode. A literal `srs` in the name is not generic and
    # keeps its claim. This is a stated tie-break, not a genuine ambiguity, so it
    # resolves silently.
    if len(hits) > 1 and hits.get('SRS') in GENERIC_SRS_KEYWORDS:
        del hits['SRS']

    if not hits:
        return Classification(None, UNMATCHED, None, ())
    if len(hits) > 1:
        # Guessing here is how a doc lands in the wrong column and stays there. Refuse,
        # and report every candidate so the caller can put the choice to the user.
        return Classification(None, AMBIGUOUS, None, tuple(sorted(hits)))

    node_type, keyword = next(iter(hits.items()))
    return Classification(node_type, MATCHED, keyword, (node_type,))


def detect_node_type(filename):
    """Return 'PRD'/'ARCH'/'RISK'/'SRS'/'VERIF'/'VAL', or None if not indexable."""
    return classify(filename).node_type
