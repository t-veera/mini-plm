"""Traceability parsing and graph logic.

Module map:
    doctypes.py  filename -> node type (PRD/ARCH/RISK/SRS/VERIF/VAL)
    extract.py   markdown scanning: lines, tables, declared node IDs
    links.py     reference semantics: "satisfies R001", "traces to" columns
    parse.py     write side: one file -> TraceNode/TraceEdge rows
    inherit.py   which iteration supplies each doc type at a given scope
    status.py    GREEN/YELLOW/RED from nodes + edges
    graph.py     read side: resolved nodes + edges + statuses for one iteration

parse.py and graph.py are the only modules that touch the database. The rest is pure
Python with no Django imports, so the parsing and graph rules behave identically on
SQLite and PostgreSQL and can be reasoned about in isolation.
"""
