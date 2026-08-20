"""Traceability parsing and graph logic.

Module map:
    doctypes.py  filename -> node type (PRD/ARCH/RISK/SRS/VERIF/VAL), or excluded
    extract.py   markdown scanning: lines, tables, declared node IDs
    sheets.py    the same, for a test-protocol spreadsheet: rows in, Line records out
    links.py     reference semantics: "satisfies R001", "traces to" columns
    parse.py     write side: one file -> TraceNode/TraceEdge rows
    status.py    GREEN/YELLOW/RED from nodes + edges
    graph.py     read side: nodes + edges + statuses for one container

A container shows only what was uploaded into it. There is deliberately no inheritance
between containers: an iteration's scope diverges from the one before it, so showing an
earlier container's documents would present superseded content as current.

parse.py and graph.py are the only modules that touch the database. The rest is pure
Python with no Django imports, so the parsing and graph rules behave identically on
SQLite and PostgreSQL and can be reasoned about in isolation.

Markdown and spreadsheets share one path: sheets.py emits the very Line/TableRow records
iter_lines() produces, so ID declaration, title/status columns and reference-following
are written once and behave the same in both.
"""
