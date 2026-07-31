"""Orchestrator: turn ONE markdown file into TraceNode/TraceEdge rows.

The only module here that talks to the database. Parsing is idempotent -- every run
deletes exactly the rows this file owns and rewrites them, so reparsing a file can
never duplicate or strand anything.
"""
import logging

from django.db import transaction

from . import links
from .containers import ITERATION, STAGE, container_key
from .doctypes import detect_node_type
from .extract import canonical, compile_id_pattern, declared_node, iter_lines, node_type_for_tag

logger = logging.getLogger('files')

TEST_TYPES = ('VERIF', 'VAL')


def parse_file(file, id_pattern=None):
    """Reindex `file`. Returns (node_count, edge_count), or None if it was skipped.

    Skipped when the file is not markdown, is not attached to any container, has no
    readable content, or has a filename no doc type recognises. In every skip case the
    file's existing rows are still cleared, so renaming a doc out of the scheme removes
    its stale index instead of leaving it behind.

    Container-agnostic: a doc uploaded into a Stage indexes exactly like one uploaded
    into an Iteration, and inheritance places both by the continuous IIL order.
    """
    if not _is_markdown(file):
        return None

    container = file.content_object
    product = file.product
    if container is None or product is None or file.container_type not in (ITERATION, STAGE):
        return None

    node_type = detect_node_type(file.name)
    if node_type is None:
        _clear(file)
        return None

    text = _read_text(file)
    if text is None:
        _clear(file)
        return None

    nodes, edges = extract_document(text, node_type, id_pattern=id_pattern)
    _write(file, product, container, node_type, nodes, edges)
    return len(nodes), len(edges)


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


def extract_document(text, node_type, id_pattern=None):
    """Pure pass over the text: (nodes, edges).

    `nodes` are DeclaredNode records deduplicated by canonical tag (first wins).
    `edges` are (parent_canonical, child_canonical) pairs. References attach to the
    node most recently declared at or before that line, which is how a "traces to"
    line under a requirement reads to a human.
    """
    id_re = compile_id_pattern(id_pattern)
    nodes = []
    edges = []
    seen_tags = set()
    current_key = None

    for line in iter_lines(text):
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


def _is_markdown(file):
    return bool(file) and (file.name or '').lower().endswith('.md')


def _read_text(file):
    """Current bytes of the file, decoded leniently. None if unreadable."""
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
            return source.read().decode('utf-8', 'replace')
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
