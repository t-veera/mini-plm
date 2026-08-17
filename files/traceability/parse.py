"""Orchestrator: turn ONE markdown file into TraceNode/TraceEdge rows.

The only module here that talks to the database. Parsing is idempotent -- every run
deletes exactly the rows this file owns and rewrites them, so reparsing a file can
never duplicate or strand anything.
"""
import io
import logging
import os

from django.db import transaction

from . import links
from .containers import ITERATION, STAGE, container_key
from .doctypes import AMBIGUOUS, EXCLUDED, MATCHED, classify
from .extract import canonical, compile_id_pattern, declared_node, iter_lines, node_type_for_tag
from .sheets import iter_sheet_lines

logger = logging.getLogger('files')

TEST_TYPES = ('VERIF', 'VAL')

MARKDOWN_SUFFIXES = ('.md',)
SHEET_SUFFIXES = ('.xlsx', '.xlsm')


def parse_file(file, id_pattern=None):
    """Reindex `file`. Returns (node_count, edge_count), or None if it was skipped.

    Skipped when the file is neither markdown nor a spreadsheet, is not attached to any
    container, has no readable content, or has a filename no doc type recognises. In
    every skip case the file's existing rows are still cleared, so renaming a doc out of
    the scheme removes its stale index instead of leaving it behind.

    Container-agnostic: a doc uploaded into a Stage indexes exactly like one uploaded
    into an Iteration, and inheritance places both by the continuous IIL order.
    """
    suffix = _suffix(file)
    if suffix not in MARKDOWN_SUFFIXES + SHEET_SUFFIXES:
        return None

    container = file.content_object
    product = file.product
    if container is None or product is None or file.container_type not in (ITERATION, STAGE):
        return None

    node_type = _resolve_node_type(file)
    if node_type is None:
        _clear(file)
        return None

    source = _read_bytes(file)
    if source is None:
        _clear(file)
        return None

    if suffix in SHEET_SUFFIXES:
        lines = iter_sheet_lines(io.BytesIO(source))
    else:
        lines = iter_lines(source.decode('utf-8', 'replace'))

    nodes, edges = extract_lines(lines, id_pattern=id_pattern)
    _write(file, product, container, node_type, nodes, edges)
    return len(nodes), len(edges)


def _resolve_node_type(file):
    """The doc type to index `file` as, or None when it must not be indexed.

    Every None is logged at the level its cause deserves: an excluded document is
    routine and says nothing, an unrecognised one warns (a doc the user expected in the
    matrix silently vanishing is the failure mode this whole function exists to avoid),
    and an ambiguous one warns loudest because it needs a human to settle it.
    """
    result = classify(file.name)
    if result.outcome == MATCHED:
        return result.node_type
    if result.outcome == EXCLUDED:
        logger.info("traceability: %s is a %s document; not indexed by design",
                    file.name, result.matched)
        return None
    if result.outcome == AMBIGUOUS:
        logger.warning(
            "traceability: %s matches more than one document type (%s) -- not indexed. "
            "Rename it so one type is unambiguous.",
            file.name, ', '.join(result.candidates))
        return None
    logger.warning("traceability: %s matches no document type; not indexed. Name it for "
                   "its type (prd / arch / risk / srs / verification / validation) to "
                   "include it in the matrix.", file.name)
    return None


def parse_file_safely(file):
    """parse_file() that can never fail its caller.

    This is what the upload path calls. Indexing is a convenience built on top of the
    files; a broken document, an unreadable blob or a bug in here must never cost
    someone their upload, so every exception is logged and swallowed.
    """
    try:
        return parse_file(file)
    except Exception:
        logger.exception("traceability: parse failed for %s (id=%s)",
                         getattr(file, 'name', '?'), getattr(file, 'id', '?'))
        return None


def extract_document(text, node_type=None, id_pattern=None):
    """Pure pass over markdown text: (nodes, edges)."""
    return extract_lines(iter_lines(text), id_pattern=id_pattern)


def extract_lines(lines, id_pattern=None):
    """Pure pass over Line records: (nodes, edges).

    `nodes` are DeclaredNode records deduplicated by canonical tag (first wins).
    `edges` are (parent_canonical, child_canonical) pairs. References attach to the
    node most recently declared at or before that line, which is how a "traces to"
    line under a requirement reads to a human.

    Takes Lines rather than text so a spreadsheet row and a markdown table row travel
    the identical path -- see sheets.py.
    """
    id_re = compile_id_pattern(id_pattern)
    nodes = []
    edges = []
    seen_tags = set()
    current_key = None

    for line in lines:
        node = declared_node(line, id_re)
        if node is not None:
            key = canonical(node.tag_id)
            current_key = key
            if key not in seen_tags:
                seen_tags.add(key)
                nodes.append(node)

        if current_key is None:
            continue
        for parent in links.references(line, id_re):
            if parent != current_key:
                edges.append((parent, current_key))

    return nodes, _dedupe(edges)


def _suffix(file):
    return os.path.splitext((getattr(file, 'name', '') or '').lower())[1]


def _read_bytes(file):
    """Current bytes of the file. None if unreadable.

    Bytes rather than text: a spreadsheet has to reach openpyxl undecoded, and markdown
    is decoded at the point of use.
    """
    source = None
    revision = file.latest_revision
    if revision is not None and revision.uploaded_file:
        source = revision.uploaded_file
    elif file.uploaded_file:
        source = file.uploaded_file
    if source is None:
        return None
    try:
        source.open('rb')
        try:
            return source.read()
        finally:
            source.close()
    except Exception:
        logger.warning("traceability: could not read %s (id=%s)", file.name, file.id, exc_info=True)
        return None


def _clear(file):
    from ..models import TraceEdge, TraceNode
    TraceNode.objects.filter(source_file=file).delete()
    TraceEdge.objects.filter(source_file=file).delete()


def _write(file, product, container, node_type, nodes, edges):
    from ..models import TraceEdge, TraceNode

    key = container_key(container)
    is_iteration = file.container_type == ITERATION

    with transaction.atomic():
        _clear(file)
        for node in nodes:
            # A tag's own prefix decides its kind when it names one (RSK-04 is a risk
            # wherever it is written); otherwise it inherits the document's kind.
            resolved_type = node_type_for_tag(node.tag_id, node_type)
            # update_or_create rather than create: another file of the same type in the
            # same container may already hold this tag, and the unique constraint would
            # otherwise abort the whole parse. Last file parsed owns the tag.
            TraceNode.objects.update_or_create(
                product=product,
                source_container_key=key,
                node_type=resolved_type,
                tag_id=node.tag_id,
                defaults={
                    'source_iteration': container if is_iteration else None,
                    'source_stage': None if is_iteration else container,
                    'source_file': file,
                    'title': node.title,
                    'source_line': node.source_line,
                    'snippet': node.snippet,
                    'test_status': node.test_status if resolved_type in TEST_TYPES else None,
                    'subsystem': node.subsystem,
                },
            )
        TraceEdge.objects.bulk_create([
            TraceEdge(product=product, parent_tag_id=parent, child_tag_id=child, source_file=file)
            for parent, child in edges
        ])


def _dedupe(pairs):
    seen = set()
    unique = []
    for pair in pairs:
        if pair not in seen:
            seen.add(pair)
            unique.append(pair)
    return unique
