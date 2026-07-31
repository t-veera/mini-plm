"""Traceability routes, included from mpp_backend/urls.py under /api/traceability/."""
from django.urls import path

from .trace_views import trace_preference, traceability_graph

urlpatterns = [
    path('<int:product_id>/', traceability_graph, name='traceability-graph'),
    path('<int:product_id>/preference/', trace_preference, name='traceability-preference'),
]
