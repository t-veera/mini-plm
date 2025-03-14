# files/views.py

import os
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework import viewsets
from rest_framework.response import Response
from .models import File
from .serializers import FileSerializer

class FileViewSet(viewsets.ModelViewSet):
    """
    A viewset for listing, creating, retrieving,
    updating, and deleting File objects.
    """
    queryset = File.objects.all()
    serializer_class = FileSerializer

    def perform_create(self, serializer):
        # Debug: confirm the method is called
        print("DEBUG: Entered perform_create in FileViewSet")

        # Retrieve the file from request.FILES using the key 'uploaded_file'
        uploaded_file = self.request.FILES.get('uploaded_file')
        print("DEBUG: uploaded_file =", uploaded_file)

        if not uploaded_file:
            print("DEBUG: No file found in request!")
            raise ValueError("No file uploaded.")

        # Extract the file's original name
        file_name = uploaded_file.name
        print("DEBUG: file_name =", file_name)

        # Define the storage directory (MEDIA_ROOT from settings.py)
        storage_dir = settings.MEDIA_ROOT
        os.makedirs(storage_dir, exist_ok=True)
        file_path = os.path.join(storage_dir, file_name)

        # Debug: confirm the path
        print("DEBUG: file_path =", file_path)

        # Write the file to disk
        with open(file_path, 'wb') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        # Determine the owner
        if self.request.user.is_authenticated:
            user = self.request.user
            print("DEBUG: request.user is authenticated =", user)
        else:
            user = User.objects.first()
            print("DEBUG: Fallback user =", user)

        # Just before saving, check validated_data
        print("DEBUG: serializer.validated_data (before save):", serializer.validated_data)

        # Now save the File record in the database
        serializer.save(
            owner=user,
            name=file_name,
            file_path=file_path
        )

        # Debug: confirm creation
        print("DEBUG: File object created successfully")
