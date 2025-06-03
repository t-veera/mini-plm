import os
import logging
import mimetypes
from django.conf import settings
from django.contrib.auth.models import User
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny

from .models import File, FileRevision, Product, Stage
from .serializers import FileSerializer, FileRevisionSerializer, ProductSerializer, StageSerializer

logger = logging.getLogger('files')

class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]  # Disable auth temporarily
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else User.objects.first()
        serializer.save(owner=user)

class StageViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]  # Disable auth temporarily
    queryset = Stage.objects.all().order_by('order')
    serializer_class = StageSerializer

class FileViewSet(viewsets.ModelViewSet):
    permission_classes = [AllowAny]  # Disable auth temporarily
    queryset = File.objects.all()
    serializer_class = FileSerializer
    parser_classes = (MultiPartParser, FormParser)

    def list(self, request, *args, **kwargs):
        # Override list to filter files by owner (authenticated user)
        # Temporarily bypass auth check: return all files
        files = File.objects.all()
        serializer = self.get_serializer(files, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='my-files')
    def my_files(self, request):
        # Temporarily bypass auth check: return all files
        files = File.objects.all()
        serializer = self.get_serializer(files, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='preview-doc')
    def preview_doc(self, request):
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
        uploaded_file = request.FILES.get('uploaded_file')
        logger.debug(f"Upload attempt: {uploaded_file.name if uploaded_file else 'None'}")
        logger.debug(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")

        if not uploaded_file:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        # Extract additional parameters
        original_name = request.data.get('original_name', uploaded_file.name)
        is_child_file = request.data.get('is_child_file', '').lower() == 'true'
        parent_id = request.data.get('parent_id')
        parent_revision = request.data.get('parent_revision')
        stage_id = request.data.get('stage_id')
        change_description = request.data.get('change_description', '')
        status_value = request.data.get('status', 'In-Work')
        price_value = request.data.get('price')

        user = request.user if request.user.is_authenticated else User.objects.first()

        # Handle Product - default to product id 1 if not specified
        product_id = request.data.get('product_id', 1)
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({"error": "Product not found."}, status=status.HTTP_404_NOT_FOUND)

        # Handle Stage
        if not stage_id:
            # Default to first stage of product
            stage = product.stages.first()
            if not stage:
                return Response({"error": "No stages found for the product."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            try:
                stage = Stage.objects.get(id=stage_id, product=product)
            except Stage.DoesNotExist:
                return Response({"error": "Stage not found for the given product."}, status=status.HTTP_404_NOT_FOUND)

        # Handle parent-child relationships
        parent_file_obj = None
        if is_child_file and parent_id:
            try:
                parent_file_obj = File.objects.get(id=parent_id)
            except File.DoesNotExist:
                return Response({"error": "Parent file not found."}, status=status.HTTP_404_NOT_FOUND)

        # Check if file exists (for revisions)
        file_lookup = {'name': original_name, 'stage': stage}
        if is_child_file and parent_file_obj:
            file_lookup.update({
                'parent_file': parent_file_obj,
                'parent_revision': parent_revision,
                'is_child_file': True
            })
        else:
            file_lookup['is_child_file'] = False

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
                change_description=change_description,
                status=status_value
            )
            
            if price_value:
                try:
                    new_revision.price = float(price_value)
                except (ValueError, TypeError):
                    pass
            
            new_revision.save()
            new_revision.file_path = new_revision.uploaded_file.name
            new_revision.save()

            # Update file's current revision and file_path
            existing_file.current_revision = revision_number
            existing_file.file_path = new_revision.file_path
            existing_file.save()

            return Response({
                "id": existing_file.id,
                "name": existing_file.name,
                "revision": revision_number,
                "upload_date": new_revision.upload_date.isoformat(),
                "file_path": new_revision.file_path,
                "is_child_file": existing_file.is_child_file,
                "parent_id": existing_file.parent_file.id if existing_file.parent_file else None,
                "parent_revision": existing_file.parent_revision,
                "status": new_revision.status,
                "price": str(new_revision.price) if new_revision.price else None
            }, status=status.HTTP_201_CREATED)
        else:
            # Creating new file
            logger.debug(f"Creating new file: {original_name}")
            
            file_instance = File(
                owner=user,
                name=original_name,
                uploaded_file=uploaded_file,
                stage=stage,
                parent_file=parent_file_obj,
                parent_revision=int(parent_revision) if parent_revision else None,
                is_child_file=is_child_file,
                status=status_value
            )
            
            if price_value:
                try:
                    file_instance.price = float(price_value)
                except (ValueError, TypeError):
                    pass
            
            file_instance.save()
            file_instance.file_path = file_instance.uploaded_file.name
            file_instance.save()

            # Create first revision
            new_revision = FileRevision(
                file=file_instance,
                revision_number=1,
                uploaded_file=uploaded_file,
                change_description=change_description,
                status=status_value
            )
            
            if price_value:
                try:
                    new_revision.price = float(price_value)
                except (ValueError, TypeError):
                    pass
            
            new_revision.save()
            new_revision.file_path = new_revision.uploaded_file.name
            new_revision.save()

            return Response({
                "id": file_instance.id,
                "name": file_instance.name,
                "revision": 1,
                "upload_date": file_instance.upload_date.isoformat(),
                "file_path": file_instance.file_path,
                "is_child_file": file_instance.is_child_file,
                "parent_id": file_instance.parent_file.id if file_instance.parent_file else None,
                "parent_revision": file_instance.parent_revision,
                "status": new_revision.status,
                "price": str(new_revision.price) if new_revision.price else None
            }, status=status.HTTP_201_CREATED)
