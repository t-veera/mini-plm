"""Assemble the graph for a product as of one container in the continuous IIL order.

Reads the index, applies container inheritance, then hands the result to status.py.
Shared by the read endpoint and the parse_traceability command so both see exactly the
same graph.
"""
from .containers import display_name, list_containers, ordinal_by_key
from .extract import canonical
from .inherit import resolve_effective_containers
from .status import compute_statuses

# Upstream -> downstream. Used for stable ordering and for tie-breaking when two doc
# types happen to declare the same tag.
DOC_ORDER = ['PRD', 'ARCH', 'RISK', 'SRS', 'VERIF', 'VAL']


def build_graph(product, scope_container, containers=None):
    """Graph for `product` as seen from `scope_container`, as plain JSON-ready dicts.

    `scope_container` is a Container record from containers.list_containers(); pass the
    already-built `containers` list to avoid re-querying when the caller has one.
    """
    from ..models import ManualTraceEdge, TraceEdge, TraceNode

    if containers is None:
        containers = list_containers(product)
    ordinals = ordinal_by_key(containers)
    scope_ordinal = scope_container.ordinal

    candidates = [
        node for node in TraceNode.objects.filter(product=product).select_related('source_file')
        # A node whose container has since been deleted has no place in the order.
        if node.source_container_key in ordinals
    ]

    effective = resolve_effective_containers(
        ((node.node_type, node.source_container_key, ordinals[node.source_container_key])
         for node in candidates),
        scope_ordinal,
    )

    resolved = [
        node for node in candidates
        if effective.get(node.node_type, (None, None))[0] == node.source_container_key
    ]
    resolved.sort(key=lambda node: (_doc_rank(node.node_type), node.tag_id))

    # Only the resolved files' edges apply: an older doc that lost to a newer one must
    # not keep injecting links into the current view.
    resolved_file_ids = {node.source_file_id for node in resolved}
    edge_rows = TraceEdge.objects.filter(product=product, source_file_id__in=resolved_file_ids)

    # `resolved` is already in display order, so this dict is too (first wins: the same
    # tag declared in two doc types is a doc bug, and the upstream-most declaration is
    # the more useful one to show).
    by_key = {}
    for node in resolved:
        by_key.setdefault(canonical(node.tag_id), node)

    status_input = {
        key: {
            'node_type': node.node_type,
            'ordinal': ordinals[node.source_container_key],
            'test_status': node.test_status,
        }
        for key, node in by_key.items()
    }
    # Parsed and manual edges are one graph. A manual edge is not filtered by source
    # file -- it has none -- but it is still only drawn when both of its ends are
    # visible at this scope, exactly like a parsed one.
    parsed_pairs = _dedupe(_visible(edge_rows, status_input))
    manual_pairs = _dedupe(_visible(
        ManualTraceEdge.objects.filter(product=product), status_input))
    parsed_set = set(parsed_pairs)
    # Union, parsed first: a pair drawn both ways is one edge, and it renders as the
    # parsed one because that is the stronger claim -- the document itself says so.
    edge_pairs = parsed_pairs + [pair for pair in manual_pairs if pair not in parsed_set]

    statuses = compute_statuses(status_input, edge_pairs)

    by_container = {container.key: container for container in containers}
    nodes = [_node_payload(key, node, statuses[key], by_container, scope_ordinal)
             for key, node in by_key.items()]

    counts = {'GREEN': 0, 'YELLOW': 0, 'RED': 0}
    for status in statuses.values():
        counts[status] += 1
    counts['total'] = len(nodes)

    return {
        'product': {'id': product.id, 'name': product.name},
        'scope': _container_payload(scope_container),
        # Back-compat with the phase-1 payload, which callers may still read.
        'iteration': _container_payload(scope_container),
        'containers': [_container_payload(c) for c in containers],
        'resolved': _resolved_payload(effective, resolved, by_container, scope_ordinal),
        'subsystems': sorted({node.subsystem for node in resolved if node.subsystem}),
        'nodes': nodes,
        # `manual` drives the connector's line style in the matrix (solid parsed, dashed
        # manual). It is not a status: node colours are untouched by how an edge was made.
        'edges': [{'parent': parent, 'child': child, 'manual': (parent, child) not in parsed_set}
                  for parent, child in edge_pairs],
        'counts': counts,
    }


def _container_payload(container):
    if container is None:
        return None
    return {
        'key': container.key,
        'kind': container.kind,
        'id': container.id,
        'label': container.label,
        'name': container.name,
        'display_name': display_name(container),
        'ordinal': container.ordinal,
        # Phase-1 field names, kept so existing consumers don't break.
        'iteration_id': container.label if container.kind == 'iteration' else None,
    }


def _node_payload(key, node, status, by_container, scope_ordinal):
    container = by_container.get(node.source_container_key)
    return {
        'key': key,
        'tag_id': node.tag_id,
        'node_type': node.node_type,
        'title': node.title,
        'status': status,
        'test_status': node.test_status,
        'subsystem': node.subsystem,
        'source_line': node.source_line,
        'snippet': node.snippet,
        'source_file_id': node.source_file_id,
        'source_file_name': node.source_file.name,
        'container': _container_payload(container),
        'container_label': container.label if container else '',
        'inherited': bool(container and container.ordinal < scope_ordinal),
    }


def _resolved_payload(effective, resolved, by_container, scope_ordinal):
    files_by_type = {}
    for node in resolved:
        files_by_type.setdefault(node.node_type, {})[node.source_file_id] = node.source_file.name

    payload = []
    for node_type in DOC_ORDER:
        key, ordinal = effective.get(node_type, (None, None))
        container = by_container.get(key)
        payload.append({
            'node_type': node_type,
            'container': _container_payload(container),
            'container_label': container.label if container else None,
            'inherited': ordinal is not None and ordinal < scope_ordinal,
            'files': sorted(files_by_type.get(node_type, {}).values()),
        })
    return payload


def _doc_rank(node_type):
    return DOC_ORDER.index(node_type) if node_type in DOC_ORDER else len(DOC_ORDER)


def _visible(edges, status_input):
    """(parent, child) for edges whose both ends are in view. Self-loops dropped."""
    return ((edge.parent_tag_id, edge.child_tag_id) for edge in edges
            if edge.parent_tag_id in status_input and edge.child_tag_id in status_input
            and edge.parent_tag_id != edge.child_tag_id)


def _dedupe(pairs):
    seen = set()
    unique = []
    for pair in pairs:
        if pair not in seen:
            seen.add(pair)
            unique.append(pair)
    return unique
