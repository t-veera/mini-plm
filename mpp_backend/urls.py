"""
URL configuration for mpp_backend project.
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
from files.auth_views import login_view, logout_view, check_auth, register_user

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
    path('api/initial-setup/', initial_setup, name='initial-setup'),
    path('api/csrf/', csrf_token, name='csrf'),
    path('api/auth/login/', login_view, name='login'),
    path('api/auth/logout/', logout_view, name='logout'),
    path('api/auth/check/', check_auth, name='check-auth'),
    path('api/auth/register/', register_user, name='register'),
    path('api-auth/', include('rest_framework.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
