"""Compute GREEN / YELLOW / RED per node.

Status is never stored: it depends on which iteration you are looking from, so it is
derived on every read. Traversal is plain-Python BFS (no recursive CTEs) so SQLite and
PostgreSQL cannot disagree, and cycles are tolerated rather than fatal.

Rules, in the order they are applied:
  RED     upstream of (or is) a FAIL test -- a failure taints everything feeding it
  RED     orphan: a PRD with nothing downstream, a test with nothing upstream, or an
          intermediate node missing either side
  YELLOW  declared but incomplete: no downstream PASS test yet, or the only passing
          coverage is older than the node itself (stale)
  GREEN   a complete downstream chain ending in a current PASS test
"""
from collections import defaultdict, deque

GREEN = 'GREEN'
YELLOW = 'YELLOW'
RED = 'RED'

TEST_TYPES = ('VERIF', 'VAL')


def compute_statuses(nodes, edges):
    """Return {key: status}.

    `nodes` maps a canonical tag key to a dict with 'node_type', 'ordinal' (its
    container's position in the continuous IIL order) and 'test_status'
    (PASS/FAIL/None). `edges` is an iterable of (parent_key, child_key); pairs touching
    unknown keys or self-loops are ignored.
    """
    children = defaultdict(set)
    parents = defaultdict(set)
    for parent, child in edges:
        if parent == child or parent not in nodes or child not in nodes:
            continue
        children[parent].add(child)
        parents[child].add(parent)

    statuses = {}
    for key, node in nodes.items():
        tests = _reachable_tests(key, nodes, children)

        if any(nodes[test]['test_status'] == 'FAIL' for test in tests):
            statuses[key] = RED
            continue

        if _is_orphan(key, node, children, parents):
            statuses[key] = RED
            continue

        passing = [test for test in tests if nodes[test]['test_status'] == 'PASS']
        if not passing:
            statuses[key] = YELLOW
            continue

        newest_pass = max(nodes[test]['ordinal'] for test in passing)
        statuses[key] = YELLOW if newest_pass < node['ordinal'] else GREEN

    return statuses


def _reachable_tests(start, nodes, children):
    """Test nodes reachable downstream, counting `start` itself when it is a test."""
    found = set()
    seen = {start}
    queue = deque([start])
    while queue:
        key = queue.popleft()
        if nodes[key]['node_type'] in TEST_TYPES:
            found.add(key)
        for child in children.get(key, ()):
            if child not in seen:
                seen.add(child)
                queue.append(child)
    return found


def _is_orphan(key, node, children, parents):
    has_downstream = bool(children.get(key))
    has_upstream = bool(parents.get(key))
    node_type = node['node_type']
    if node_type == 'PRD':
        return not has_downstream
    if node_type in TEST_TYPES:
        return not has_upstream
    return not (has_upstream and has_downstream)
