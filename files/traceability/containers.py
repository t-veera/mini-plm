"""The continuous IIL order across Iteration and Stage containers.

I1,I2,I3 -> S1 -> I4,I5 -> S2. Neither model carries a cross-type sequence number
(`iteration_number` and `stage_number` are independent counters, and `order` is 0 on
real rows), so the total order comes from `created_at` -- which is exactly what the
container rail in App.js and the BOM scope selector already sort by. Using anything
else here would make the matrix disagree with the rail the user is looking at.

`ordinal` is the position in that order (0-based) and is computed on read, never
stored: inserting a container would otherwise silently invalidate every stored value.
"""
from collections import namedtuple

Container = namedtuple('Container', 'key kind id label name ordinal created_at obj')

ITERATION = 'iteration'
STAGE = 'stage'


def container_key(obj):
    """'iteration:3' / 'stage:1' for an Iteration or Stage instance."""
    from ..models import Iteration, Stage
    if isinstance(obj, Iteration):
        return f"{ITERATION}:{obj.id}"
    if isinstance(obj, Stage):
        return f"{STAGE}:{obj.id}"
    return ''


def order_containers(iterations, stages):
    """Pure: merge the two lists into one ordered sequence of Container records.

    Ties on created_at (bulk-created rows can share a timestamp) fall back to
    iterations-before-stages then id, so the order is stable across calls.
    """
    rows = [(obj.created_at, 0, obj.id, ITERATION, f"I{obj.iteration_number}", obj) for obj in iterations]
    rows += [(obj.created_at, 1, obj.id, STAGE, f"S{obj.stage_number}", obj) for obj in stages]
    rows.sort(key=lambda row: (row[0], row[1], row[2]))

    return [
        Container(key=f"{kind}:{obj_id}", kind=kind, id=obj_id, label=label,
                  name=obj.name or label, ordinal=ordinal, created_at=created, obj=obj)
        for ordinal, (created, _tie, obj_id, kind, label, obj) in enumerate(rows)
    ]


def list_containers(product):
    """Every container of `product` in continuous IIL order."""
    from ..models import Iteration, Stage
    return order_containers(
        list(Iteration.objects.filter(product=product)),
        list(Stage.objects.filter(product=product)),
    )


def ordinal_by_key(containers):
    return {container.key: container.ordinal for container in containers}


def find_container(containers, key):
    for container in containers:
        if container.key == key:
            return container
    return None


def display_name(container):
    """'I2 Prototype two' -- matches containerDisplayName() in the frontend."""
    if container.name and container.name != container.label:
        return f"{container.label} {container.name[:1].upper()}{container.name[1:]}"
    return container.label
