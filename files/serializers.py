from rest_framework import serializers
from .models import File, FileRevision

class FileRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileRevision
        fields = [
            'revision_number',
            'file_path',
            'upload_date',
        ]

class FileSerializer(serializers.ModelSerializer):
    uploaded_file = serializers.FileField(write_only=True, required=False)
    revisions = FileRevisionSerializer(many=True, read_only=True)

    class Meta:
        model = File
        fields = [
            'id',
            'owner',
            'name',
            'upload_date',
            'file_path',
            'metadata',
            'uploaded_file',
            'revisions',
        ]
        read_only_fields = ['id', 'owner', 'upload_date', 'file_path']