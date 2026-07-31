"""Map a filename to a traceability document type.

Detection is on the filename stem only -- engineers name these docs consistently
(`PRD.md`, `sys_arch.md`, `fmea.md`, `srs.md`, `verification.md`, `validation.md`) and
reading file contents to guess would produce surprises. An unrecognised name returns
None, which means "index nothing for this file"; it is never an error.
"""
import os
import re

# Ordered most-specific first: a file called `verification_spec.md` is a VERIF doc, not
# an SRS, so the generic `spec`/`requirement` patterns must be tested last.
#
# PRD vs SRS: only an explicit `prd` (or "product requirements") is a PRD. A file called
# `Requirements.md` is the detailed spec — the SRS — which is how these docs are named in
# practice. Getting this backwards makes a PRD and a requirements doc fight over the same
# slot, and whichever parses last silently wins.
DOCTYPE_PATTERNS = [
    ('VERIF', r'verif|test[_\-\s]?(?:protocol|plan|spec|case|report)|acceptance'),
    ('VAL', r'validation|(?:^|[_\-\s])val(?:[_\-\s]|$)'),
    ('RISK', r'fmea|risk|hazard'),
    ('ARCH', r'sys[_\-]?arch|architecture'),
    ('PRD', r'prd|product[_\-\s]?requirement'),
    ('SRS', r'srs|spec|requirement'),
]

_COMPILED = [(node_type, re.compile(pattern, re.I)) for node_type, pattern in DOCTYPE_PATTERNS]


def detect_node_type(filename):
    """Return 'PRD'/'ARCH'/'RISK'/'SRS'/'VERIF'/'VAL', or None if unrecognised."""
    if not filename:
        return None
    stem = os.path.splitext(os.path.basename(filename))[0]
    for node_type, pattern in _COMPILED:
        if pattern.search(stem):
            return node_type
    return None
