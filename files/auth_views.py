from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        login(request, user)
        return Response({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff
            }
        })
    else:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )

@api_view(['POST'])
@authentication_classes([])  # Skip SessionAuthentication's CSRF enforcement
@permission_classes([AllowAny])
def logout_view(request):
    # Logout must always invalidate the server-side session, even if a CSRF
    # token is missing or stale. With DRF's default SessionAuthentication, a
    # missing/invalid CSRF token makes authentication raise 403 *before*
    # logout() runs, so the sessionid cookie is never cleared and the user is
    # silently re-authenticated on the next page refresh. Dropping the
    # authenticators removes that CSRF gate; logout() still flushes
    # request.session (loaded from the cookie by SessionMiddleware,
    # independent of DRF auth) and expires the session cookie.
    logout(request)
    return Response({'success': True, 'message': 'Logged out successfully'})

@api_view(['GET'])
@permission_classes([AllowAny])
def check_auth(request):
    if request.user.is_authenticated:
        return Response({
            'authenticated': True,
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'is_staff': request.user.is_staff
            }
        })
    else:
        return Response({'authenticated': False})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_user(request):
    if not request.user.is_staff:
        return Response(
            {'error': 'Only administrators can create new users'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email', '')
    is_staff = request.data.get('is_staff', False)
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if len(password) < 8:
        return Response(
            {'error': 'Password must be at least 8 characters'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        if is_staff:
            user = User.objects.create_superuser(username=username, email=email, password=password)
        else:
            user = User.objects.create_user(username=username, email=email, password=password)
        
        return Response({
            'success': True,
            'message': 'User created successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff
            }
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response(
            {'error': f'User creation failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
