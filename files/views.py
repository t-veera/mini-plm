import os
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import viewsets
from .models import File
from .serializers import FileSerializer

class FileViewSet(viewsets.ModelViewSet):
    queryset = File.objects.all()
    serializer_class = FileSerializer

    def perform_create(self, serializer):
        # Get the file under the key 'uploaded_file'
        uploaded_file = self.request.FILES.get('uploaded_file')
        if not uploaded_file:
            raise ValueError("No file uploaded.")

        file_name = uploaded_file.name
        storage_dir = settings.MEDIA_ROOT
        os.makedirs(storage_dir, exist_ok=True)
        file_path = os.path.join(storage_dir, file_name)

        # Write the file to disk
        with open(file_path, 'wb') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        # For testing, assign the first user if not authenticated
        if self.request.user.is_authenticated:
            user = self.request.user
        else:
            user = User.objects.first()

        # Save the File record
        serializer.save(owner=user, name=file_name, file_path=file_path)
