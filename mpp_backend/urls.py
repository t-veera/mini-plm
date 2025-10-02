"""
URL configuration for mpp_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework import routers
from django.conf import settings
from django.conf.urls.static import static
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse

from files.views import (
    FileViewSet, 
    FileRevisionViewSet,
    ProductViewSet, 
    StageViewSet,
    IterationViewSet,
    initial_setup
)

# CSRF token endpoint for frontend
@ensure_csrf_cookie
def csrf_token(request):
    return JsonResponse({'status': 'CSRF cookie set'})

# DRF router for automatically generating endpoints
router = routers.DefaultRouter()
router.register(r'products', ProductViewSet)
router.register(r'stages', StageViewSet)
router.register(r'iterations', IterationViewSet)
router.register(r'files', FileViewSet)
router.register(r'file-revisions', FileRevisionViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/setup/', initial_setup, name='initial-setup'),  # Add this line
    path('api/csrf/', csrf_token, name='csrf'),
    path('api-auth/', include('rest_framework.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

"""
Available API endpoints:

Products:
- GET /api/products/ - List all products
- POST /api/products/ - Create new product
- GET /api/products/{id}/ - Get specific product
- PUT/PATCH /api/products/{id}/ - Update product
- DELETE /api/products/{id}/ - Delete product
- GET /api/products/{id}/files/ - Get all files for a product

Stages:
- GET /api/stages/ - List all stages (filter with ?product_id=X)
- POST /api/stages/ - Create new stage
- GET /api/stages/{id}/ - Get specific stage
- PUT/PATCH /api/stages/{id}/ - Update stage
- DELETE /api/stages/{id}/ - Delete stage
- GET /api/stages/{id}/files/ - Get all files for a stage

Iterations:
- GET /api/iterations/ - List all iterations (filter with ?product_id=X)
- POST /api/iterations/ - Create new iteration
- GET /api/iterations/{id}/ - Get specific iteration
- PUT/PATCH /api/iterations/{id}/ - Update iteration
- DELETE /api/iterations/{id}/ - Delete iteration
- GET /api/iterations/{id}/files/ - Get all files for an iteration

Files:
- GET /api/files/ - List all files (filter with ?container_type=stage&container_id=X or ?product_id=X)
- POST /api/files/ - Create new file or revision
- GET /api/files/{id}/ - Get specific file
- PUT/PATCH /api/files/{id}/ - Update file
- DELETE /api/files/{id}/ - Delete file
- GET /api/files/my-files/ - Get current user's files
- GET /api/files/preview-doc/?file_path=X - Preview document

File Revisions:
- GET /api/file-revisions/ - List all revisions (filter with ?file_id=X)
- GET /api/file-revisions/{id}/ - Get specific revision

Example Usage:
- Create Stage: POST /api/stages/ with {"product": 1, "name": "Design Phase", "type": "workflow"}
- Create Iteration: POST /api/iterations/ with {"product": 1, "name": "First Prototype", "type": "prototype"}
- Upload to Stage: POST /api/files/ with form-data including stage_id and uploaded_file
- Upload to Iteration: POST /api/files/ with form-data including iteration_id and uploaded_file
- Create Child File: POST /api/files/ with is_child_file=true and parent_id=X
"""