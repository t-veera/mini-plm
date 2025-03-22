import os
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import File, FileRevision
from .serializers import FileSerializer

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer
    parser_classes = (MultiPartParser, FormParser)

    def create(self, request, *args, **kwargs):
        """Override create method to handle file upload"""
        uploaded_file = request.FILES.get('uploaded_file')

        if not uploaded_file:
            return Response({"error": "No file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

        file_name = uploaded_file.name
        storage_dir = settings.MEDIA_ROOT
        os.makedirs(storage_dir, exist_ok=True)

        revision_number = 1
        physical_name = file_name  # Default physical name

        # Check if this is a revision of an existing file
        existing_file = File.objects.filter(name=file_name).first()
        if existing_file:
            # Get the latest revision
            last_revision = FileRevision.objects.filter(file=existing_file).order_by('-revision_number').first()
            if last_revision:
                revision_number = last_revision.revision_number + 1
            
            physical_name = f"{file_name}_rev{revision_number}"
            file_path = os.path.join(storage_dir, physical_name)
        else:
            file_path = os.path.join(storage_dir, file_name)

        # Save the uploaded file
        with open(file_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        # Set the owner (authenticated user or first user as fallback)
        if request.user.is_authenticated:
            user = request.user
        else:
            user = User.objects.first()

        # Create new file or use existing one
        if not existing_file:
            # Create new file
            file_instance = File.objects.create(
                owner=user,
                name=file_name,
                file_path=file_path
            )
        else:
            file_instance = existing_file

        # Create a new revision
        new_revision = FileRevision.objects.create(
            file=file_instance,
            revision_number=revision_number,
            file_path=file_path
        )
        
        # Return appropriate response
        return Response(
            {
                "id": file_instance.id,
                "name": file_instance.name,
                "revision": revision_number,
                "physicalName": physical_name,
                "upload_date": new_revision.upload_date.isoformat()
            },
            status=status.HTTP_201_CREATED
        )