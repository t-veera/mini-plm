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
from .models import File, FileRevision, Product, Stage
from .serializers import FileSerializer, FileRevisionSerializer, ProductSerializer, StageSerializer

logger = logging.getLogger('files')

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('-created_at')
    serializer_class = ProductSerializer

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else User.objects.first()
        serializer.save(owner=user)

class StageViewSet(viewsets.ModelViewSet):
    queryset = Stage.objects.all().order_by('order')
    serializer_class = StageSerializer

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    parser_classes = (MultiPartParser, FormParser)

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

        file_name = uploaded_file.name
        upload_dir = os.path.join(settings.MEDIA_ROOT, 'uploads')
        os.makedirs(upload_dir, exist_ok=True)

        user = request.user if request.user.is_authenticated else User.objects.first()

        existing_file = File.objects.filter(name=file_name).first()

        if existing_file:
            logger.debug(f"Creating revision for existing file: {existing_file.name}")
            last_revision = FileRevision.objects.filter(file=existing_file).order_by('-revision_number').first()
            revision_number = 1 if last_revision is None else last_revision.revision_number + 1

            new_revision = FileRevision(
                file=existing_file,
                revision_number=revision_number,
                uploaded_file=uploaded_file
            )
            new_revision.save()
            new_revision.file_path = new_revision.uploaded_file.name
            new_revision.save()

            return Response({
                "id": existing_file.id,
                "name": existing_file.name,
                "revision": revision_number,
                "upload_date": new_revision.upload_date.isoformat(),
                "file_path": new_revision.file_path
            }, status=status.HTTP_201_CREATED)
        else:
            logger.debug(f"Creating new file: {file_name}")
            file_instance = File(
                owner=user,
                name=file_name,
                uploaded_file=uploaded_file
            )
            file_instance.save()
            file_instance.file_path = file_instance.uploaded_file.name
            file_instance.save()

            new_revision = FileRevision(
                file=file_instance,
                revision_number=1,
                uploaded_file=uploaded_file
            )
            new_revision.save()
            new_revision.file_path = new_revision.uploaded_file.name
            new_revision.save()

            return Response({
                "id": file_instance.id,
                "name": file_instance.name,
                "revision": 1,
                "upload_date": file_instance.upload_date.isoformat(),
                "file_path": file_instance.file_path
            }, status=status.HTTP_201_CREATED)
