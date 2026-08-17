"""Traceability read endpoints and matrix-preference persistence.

Kept in its own module so nothing in views.py (BOM, files, folders) has to change.
The graph is read-only: the index is written by the upload hook and the
parse_traceability command.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Iteration, ManualTraceEdge, Product, TraceEdge, TraceMatrixPreference
from .traceability.containers import find_container, list_containers
from .traceability.extract import canonical
from .traceability.graph import DOC_ORDER, build_graph

MIN_COLUMNS = 2
MAX_COLUMNS = 6
STATUS_FILTERS = {choice[0] for choice in TraceMatrixPreference.STATUS_FILTERS}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def traceability_graph(request, product_id):
    """GET the traceability graph for a product as of one container.

    Scope, in precedence order:
      ?container=stage:1 / ?container=iteration:3   general form (either container type)
      ?iteration=<pk> / ?iteration_number=<n>       phase-1 form, still honoured
      (nothing)                                     the newest container in IIL order
    """
    product = Product.objects.filter(id=product_id).first()
    if product is None:
        return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

    containers = list_containers(product)
    if not containers:
        return Response({"error": "Product has no stages or iterations."},
                        status=status.HTTP_404_NOT_FOUND)

    scope, error = resolve_scope(product, containers, request.query_params)
    if error:
        return Response({"error": error}, status=status.HTTP_404_NOT_FOUND)

    return Response(build_graph(product, scope, containers=containers))


def resolve_scope(product, containers, params):
    """(Container, error). Accepts the general `container` key or the phase-1 params."""
    container_param = params.get('container')
    if container_param:
        scope = find_container(containers, container_param)
        return (scope, None) if scope else (None, "Container not found for this product.")

    iteration_pk = params.get('iteration')
    if iteration_pk:
        return _by_iteration(product, containers, 'id', iteration_pk)

    iteration_number = params.get('iteration_number')
    if iteration_number:
        return _by_iteration(product, containers, 'iteration_number', iteration_number)

    return containers[-1], None


def _by_iteration(product, containers, field, value):
    """Phase-1 lookup: an Iteration pk or number, resolved into its Container record."""
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None, f"{field} must be an integer."
    iteration = Iteration.objects.filter(product=product, **{field: number}).first()
    if iteration is None:
        return None, "Iteration not found for this product."
    return find_container(containers, f"iteration:{iteration.id}"), None


@api_view(['POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def manual_edge(request, product_id):
    """Create or remove one hand-drawn link between two trace IDs.

    POST {parent, child} links; DELETE {parent, child} unlinks. Both take the canonical
    node keys the graph payload already carries, so the caller never has to know how an
    ID is folded.

    Only manual edges can be deleted here. A parsed edge is a statement the document
    makes; removing it in the UI would just have it reappear on the next parse, so the
    request is refused with an explanation rather than silently doing nothing.
    """
    product = Product.objects.filter(id=product_id).first()
    if product is None:
        return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

    parent = canonical(request.data.get('parent'))
    child = canonical(request.data.get('child'))
    if not parent or not child:
        return Response({"error": "parent and child are both required."},
                        status=status.HTTP_400_BAD_REQUEST)
    if parent == child:
        return Response({"error": "A node cannot link to itself."},
                        status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'POST':
        edge, created = ManualTraceEdge.objects.get_or_create(
            product=product, parent_tag_id=parent, child_tag_id=child,
            defaults={'created_by': request.user},
        )
        return Response(_manual_edge_payload(edge),
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    deleted, _ = ManualTraceEdge.objects.filter(
        product=product, parent_tag_id=parent, child_tag_id=child).delete()
    if deleted:
        return Response(status=status.HTTP_204_NO_CONTENT)

    if TraceEdge.objects.filter(product=product, parent_tag_id=parent,
                                child_tag_id=child).exists():
        return Response(
            {"error": "This link is written in the source document, so it cannot be "
                      "removed here — it would come back the next time the document is "
                      "parsed. Edit the document to break it."},
            status=status.HTTP_409_CONFLICT)
    return Response({"error": "No such link."}, status=status.HTTP_404_NOT_FOUND)


def _manual_edge_payload(edge):
    return {
        'parent': edge.parent_tag_id,
        'child': edge.child_tag_id,
        'manual': True,
        'created_by': edge.created_by.username if edge.created_by else None,
        'created_at': edge.created_at,
    }


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def trace_preference(request, product_id):
    """GET/PUT the signed-in user's matrix layout for this product.

    Server-side so a column preset survives relogin and follows the user to another
    device. GET synthesises the default when the user has never saved one, so the
    frontend never has to know the defaults.
    """
    product = Product.objects.filter(id=product_id).first()
    if product is None:
        return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        preference = TraceMatrixPreference.objects.filter(user=request.user, product=product).first()
        return Response(_preference_payload(preference))

    columns, error = _clean_columns(request.data.get('columns'))
    if error:
        return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)

    status_filter = request.data.get('status_filter', 'all')
    if status_filter not in STATUS_FILTERS:
        return Response({"error": f"status_filter must be one of {sorted(STATUS_FILTERS)}."},
                        status=status.HTTP_400_BAD_REQUEST)

    subsystem_filter = request.data.get('subsystem_filter', [])
    if not isinstance(subsystem_filter, list) or not all(isinstance(s, str) for s in subsystem_filter):
        return Response({"error": "subsystem_filter must be a list of strings."},
                        status=status.HTTP_400_BAD_REQUEST)

    preference, _created = TraceMatrixPreference.objects.update_or_create(
        user=request.user,
        product=product,
        defaults={
            'columns': columns,
            'status_filter': status_filter,
            'subsystem_filter': subsystem_filter,
        },
    )
    return Response(_preference_payload(preference))


def _clean_columns(raw):
    """(columns, error). Validates type, membership, duplicates and length; keeps order."""
    if not isinstance(raw, list):
        return None, "columns must be a list of node types."
    columns = [c for c in raw if isinstance(c, str)]
    if len(columns) != len(raw):
        return None, "columns must contain only strings."
    unknown = [c for c in columns if c not in DOC_ORDER]
    if unknown:
        return None, f"unknown column(s): {', '.join(unknown)}."
    if len(set(columns)) != len(columns):
        return None, "columns must not repeat."
    if not (MIN_COLUMNS <= len(columns) <= MAX_COLUMNS):
        return None, f"columns must hold between {MIN_COLUMNS} and {MAX_COLUMNS} entries."
    return columns, None


def _preference_payload(preference):
    if preference is None:
        return {
            'columns': list(TraceMatrixPreference.DEFAULT_COLUMNS),
            'status_filter': 'all',
            'subsystem_filter': [],
            'is_default': True,
        }
    return {
        'columns': preference.columns or list(TraceMatrixPreference.DEFAULT_COLUMNS),
        'status_filter': preference.status_filter,
        'subsystem_filter': preference.subsystem_filter or [],
        'is_default': False,
    }
