"""Container inheritance: which container supplies each doc type at a given scope.

Latest-wins with fallback, walking the CONTINUOUS IIL order across both Iterations and
Stages (see containers.py). Viewing S1 when only I1 shipped an FMEA still shows the I1
risks; a doc uploaded into a Stage is inherited forward by later Iterations exactly the
same way. Pure arithmetic over ordinals, deliberately free of ORM/SQL so the rule reads
the same everywhere.
"""


def resolve_effective_containers(candidates, scope_ordinal):
    """{node_type: (container_key, ordinal)} -- newest container at or below the scope.

    `candidates` is any iterable of (node_type, container_key, ordinal) triples that
    have indexed content. Doc types with nothing at or below the scope are absent.
    """
    effective = {}
    for node_type, key, ordinal in candidates:
        if ordinal > scope_ordinal:
            continue
        current = effective.get(node_type)
        if current is None or ordinal > current[1]:
            effective[node_type] = (key, ordinal)
    return effective
