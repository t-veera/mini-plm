import os
import logging
import mimetypes
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny

from .models import File, FileRevision, Product, Stage, Iteration
from .serializers import (
    FileSerializer, FileRevisionSerializer, ProductSerializer, 
    StageSerializer, IterationSerializer
)

logger = logging.getLogger('files')

class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet for managing products"""
    permission_classes = [AllowAny]  # Disable auth temporarily
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer

    def perform_create(self, serializer):
        """Set owner when creating a product"""
        user = self.request.user if self.request.user.is_authenticated else User.objects.first()
        if not user:
            # Create a default user if none exists
            user = User.objects.create_user('default', 'default@test.com', 'password')
        
        serializer.save(owner=user)

    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """Get all files for a specific product"""
        product = self.get_object()
        
        # Get files from all stages and iterations of this product
        stage_content_type = ContentType.objects.get_for_model(Stage)
        iteration_content_type = ContentType.objects.get_for_model(Iteration)
        
        stage_ids = list(product.stages.values_list('id', flat=True))
        iteration_ids = list(product.iterations.values_list('id', flat=True))
        
        from django.db import models
        files = File.objects.filter(
            models.Q(content_type=stage_content_type, object_id__in=stage_ids) |
            models.Q(content_type=iteration_content_type, object_id__in=iteration_ids)
        ).order_by('-updated_at')
        
        serializer = FileSerializer(files, many=True, context={'request': request})
        return Response(serializer.data)

class StageViewSet(viewsets.ModelViewSet):
    """ViewSet for managing stages"""
    permission_classes = [AllowAny]  # Disable auth temporarily
    queryset = Stage.objects.all().order_by('order', 'stage_number')
    serializer_class = StageSerializer

    def get_queryset(self):
        """Filter stages by product if provided"""
        queryset = Stage.objects.all().order_by('order', 'stage_number')
        product_id = self.request.query_params.get('product_id', None)
        if product_id is not None:
            queryset = queryset.filter(product_id=product_id)
        return queryset

    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """Get all files for a specific stage"""
        stage = self.get_object()
        stage_content_type = ContentType.objects.get_for_model(Stage)
        
        files = File.objects.filter(
            content_type=stage_content_type,
            object_id=stage.id
        ).order_by('-updated_at')
        
        serializer = FileSerializer(files, many=True, context={'request': request})
        return Response(serializer.data)

class IterationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing iterations"""
    permission_classes = [AllowAny]  # Disable auth temporarily
    queryset = Iteration.objects.all().order_by('order', 'iteration_number')
    serializer_class = IterationSerializer

    def get_queryset(self):
        """Filter iterations by product if provided"""
        queryset = Iteration.objects.all().order_by('order', 'iteration_number')
        product_id = self.request.query_params.get('product_id', None)
        if product_id is not None:
            queryset = queryset.filter(product_id=product_id)
        return queryset

    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """Get all files for a specific iteration"""
        iteration = self.get_object()
        iteration_content_type = ContentType.objects.get_for_model(Iteration)
        
        files = File.objects.filter(
            content_type=iteration_content_type,
            object_id=iteration.id
        ).order_by('-updated_at')
        
        serializer = FileSerializer(files, many=True, context={'request': request})
        return Response(serializer.data)

class FileViewSet(viewsets.ModelViewSet):
    """ViewSet for managing files"""
    permission_classes = [AllowAny]  # Disable auth temporarily
    queryset = File.objects.all()
    serializer_class = FileSerializer
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def partial_update(self, request, *args, **kwargs):
        """Override to debug the 500 error"""
        import traceback
        
        print(f"=== PATCH DEBUG ===")
        print(f"File ID: {kwargs.get('pk')}")
        print(f"Request data: {request.data}")
        
        try:
            # Call the parent method
            result = super().partial_update(request, *args, **kwargs)
            print(f"✅ Update successful")
            return result
            
        except Exception as e:
            print(f"❌ ERROR TYPE: {type(e).__name__}")
            print(f"❌ ERROR MESSAGE: {str(e)}")
            print(f"❌ FULL TRACEBACK:")
            traceback.print_exc()
            
            # Re-raise the exception so Django handles it normally
            raise

    def list(self, request, *args, **kwargs):
        """List files with optional filtering"""
        queryset = self.get_queryset()
        
        # Filter by container type and id
        container_type = request.query_params.get('container_type', None)
        container_id = request.query_params.get('container_id', None)
        
        if container_type and container_id:
            if container_type == 'stage':
                stage_content_type = ContentType.objects.get_for_model(Stage)
                queryset = queryset.filter(content_type=stage_content_type, object_id=container_id)
            elif container_type == 'iteration':
                iteration_content_type = ContentType.objects.get_for_model(Iteration)
                queryset = queryset.filter(content_type=iteration_content_type, object_id=container_id)
        
        # Filter by product
        product_id = request.query_params.get('product_id', None)
        if product_id:
            from django.db import models
            stage_content_type = ContentType.objects.get_for_model(Stage)
            iteration_content_type = ContentType.objects.get_for_model(Iteration)
            
            stage_ids = Stage.objects.filter(product_id=product_id).values_list('id', flat=True)
            iteration_ids = Iteration.objects.filter(product_id=product_id).values_list('id', flat=True)
            
            queryset = queryset.filter(
                models.Q(content_type=stage_content_type, object_id__in=stage_ids) |
                models.Q(content_type=iteration_content_type, object_id__in=iteration_ids)
            )
        
        # Filter out child files by default, unless specifically requested
        include_children = request.query_params.get('include_children', 'false').lower() == 'true'
        if not include_children:
            queryset = queryset.filter(parent_file__isnull=True)
        
        queryset = queryset.order_by('-updated_at')
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='my-files')
    def my_files(self, request):
        """Get files for the current user"""
        # Temporarily bypass auth check: return all files
        files = File.objects.filter(parent_file__isnull=True).order_by('-updated_at')
        serializer = self.get_serializer(files, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='preview-doc')
    def preview_doc(self, request):
        """Preview document using Google Docs viewer"""
        file_path = request.query_params.get('file_path')
        if not file_path:
            return Response({"error": "No file path provided"}, status=status.HTTP_400_BAD_REQUEST)

        media_path = os.path.join(settings.MEDIA_ROOT, file_path)
        if not os.path.exists(media_path):
            return Response({"error": f"File not found: {file_path}"}, status=status.HTTP_404_NOT_FOUND)

        mime_type, _ = mimetypes.guess_type(media_path)
        is_word_doc = mime_type in ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if not is_word_doc:
            return Response({"error": "Not a Word document"}, status=status.HTTP_400_BAD_REQUEST)

        file_url = request.build_absolute_uri(f'/media/{file_path}')
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{os.path.basename(file_path)}</title>
            <style>
                body, html {{
                    margin: 0;
                    padding: 0;
                    height: 100%;
                    overflow: hidden;
                }}
                iframe {{
                    width: 100%;
                    height: 100%;
                    border: none;
                }}
            </style>
        </head>
        <body>
            <iframe src="https://docs.google.com/viewer?url={file_url}&embedded=true" frameborder="0"></iframe>
        </body>
        </html>
        """
        return HttpResponse(html_content, content_type='text/html')

    def create(self, request, *args, **kwargs):
        """Create a new file or file revision"""
        uploaded_file = request.FILES.get('uploaded_file')
        logger.debug(f"Upload attempt: {uploaded_file.name if uploaded_file else 'None'}")
        logger.debug(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")

        if not uploaded_file:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        # Extract parameters from request
        original_name = request.data.get('original_name', uploaded_file.name)
        is_child_file = request.data.get('is_child_file', '').lower() == 'true'
        parent_id = request.data.get('parent_id')
        stage_id = request.data.get('stage_id')
        iteration_id = request.data.get('iteration_id')
        change_description = request.data.get('change_description', '')
        status_value = request.data.get('status', 'in_work')
        price_value = request.data.get('price')
        quantity_value = request.data.get('quantity', 1)

        user = request.user if request.user.is_authenticated else User.objects.first()

        # Validate container (stage or iteration)
        container_object = None
        if stage_id:
            try:
                container_object = Stage.objects.get(id=stage_id)
                content_type = ContentType.objects.get_for_model(Stage)
            except Stage.DoesNotExist:
                return Response({"error": "Stage not found."}, status=status.HTTP_404_NOT_FOUND)
        elif iteration_id:
            try:
                container_object = Iteration.objects.get(id=iteration_id)
                content_type = ContentType.objects.get_for_model(Iteration)
            except Iteration.DoesNotExist:
                return Response({"error": "Iteration not found."}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({"error": "Either stage_id or iteration_id must be provided."}, status=status.HTTP_400_BAD_REQUEST)

        # Handle parent-child relationships
        parent_file_obj = None
        if is_child_file and parent_id:
            try:
                parent_file_obj = File.objects.get(id=parent_id)
                # Ensure parent is in the same container
                if parent_file_obj.content_type != content_type or parent_file_obj.object_id != container_object.id:
                    return Response({"error": "Parent file must be in the same container."}, status=status.HTTP_400_BAD_REQUEST)
            except File.DoesNotExist:
                return Response({"error": "Parent file not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check if file exists (for revisions)
        file_lookup = {
            'name': original_name,
            'content_type': content_type,
            'object_id': container_object.id
        }
        
        if is_child_file and parent_file_obj:
            file_lookup['parent_file'] = parent_file_obj
        else:
            file_lookup['parent_file__isnull'] = True

        existing_file = File.objects.filter(**file_lookup).first()

        if existing_file:
            # Creating a revision of existing file
            logger.debug(f"Creating revision for existing file: {existing_file.name}")
            
            last_revision = FileRevision.objects.filter(file=existing_file).order_by('-revision_number').first()
            revision_number = 1 if last_revision is None else last_revision.revision_number + 1

            new_revision = FileRevision(
                file=existing_file,
                revision_number=revision_number,
                uploaded_file=uploaded_file,
                description=change_description,
                status=status_value,
                created_by=user
            )
            
            if price_value:
                try:
                    new_revision.price = float(price_value)
                except (ValueError, TypeError):
                    pass
            
            new_revision.save()

            # Update file's current revision and file_path
            existing_file.current_revision = revision_number
            existing_file.file_path = new_revision.file_path
            existing_file.save()

            # ✅ FIXED: Use FileSerializer instead of custom response
            serializer = FileSerializer(existing_file, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            # Creating new file
            logger.debug(f"Creating new file: {original_name}")
            
            file_instance = File(
                owner=user,
                name=original_name,
                uploaded_file=uploaded_file,
                content_type=content_type,
                object_id=container_object.id,
                parent_file=parent_file_obj,
                status=status_value,
                quantity=int(quantity_value) if quantity_value else 1
            )
            
            if price_value:
                try:
                    file_instance.price = float(price_value)
                except (ValueError, TypeError):
                    pass
            
            file_instance.save()

            # Create first revision
            new_revision = FileRevision(
                file=file_instance,
                revision_number=1,
                uploaded_file=uploaded_file,
                description=change_description,
                status=status_value,
                created_by=user
            )
            
            if price_value:
                try:
                    new_revision.price = float(price_value)
                except (ValueError, TypeError):
                    pass
            
            new_revision.save()

            # ✅ FIXED: Use FileSerializer instead of custom response
            serializer = FileSerializer(file_instance, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

class FileRevisionViewSet(viewsets.ModelViewSet):

    """ViewSet for managing file revisions"""
    permission_classes = [AllowAny]
    queryset = FileRevision.objects.all().order_by('-revision_number')
    serializer_class = FileRevisionSerializer

    def get_queryset(self):
        """Filter revisions by file if provided"""
        queryset = FileRevision.objects.all().order_by('-revision_number')
        file_id = self.request.query_params.get('file_id', None)
        if file_id is not None:
            queryset = queryset.filter(file_id=file_id)
        return queryset


from rest_framework.decorators import api_view, permission_classes
@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def initial_setup(request):
    """
    GET: Check if initial setup is needed (no users exist)
    POST: Create initial admin user and sample data
    """
    if request.method == 'GET':
        # Check if any users exist
        needs_setup = not User.objects.exists()
        return Response({'needs_setup': needs_setup})
    
    elif request.method == 'POST':
        # Only allow setup if no users exist
        if User.objects.exists():
            return Response(
                {'error': 'Setup already completed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get username and password from request
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email', '')
        
        # Validate input
        if not username or not password:
            return Response(
                {'error': 'Username and password are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if len(password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Create admin user with provided credentials
            admin = User.objects.create_superuser(
                username=username,
                email=email,
                password=password
            )
            
            # Create sample product
            product = Product.objects.create(
                name='Sample Product',
                description='This is a sample product to get you started',
                owner=admin
            )
            
            # Create default stages
            Stage.objects.create(
                product=product,
                name='Concept & Early Prototyping',
                stage_number=1,
                order=1
            )
            Stage.objects.create(
                product=product,
                name='Optimization & Pre-Production',
                stage_number=2,
                order=2
            )
            Stage.objects.create(
                product=product,
                name='Final Optimization & Production',
                stage_number=3,
                order=3
            )
            
            return Response({
                'success': True,
                'message': 'Initial setup completed successfully',
                'username': username
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Setup failed: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )