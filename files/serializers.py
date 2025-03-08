from rest_framework import serializers
from .models import File

class FileSerializer(serializers.ModelSerializer):
    # Extra field for file upload
    uploaded_file = serializers.FileField(write_only=True, required=False)

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
        ]
        # We set some fields as read-only since we populate them in the view
        read_only_fields = ['owner', 'upload_date', 'file_path', 'metadata']

    def create(self, validated_data):
        # Pop uploaded_file so it doesn't try to match a model field
        file_obj = validated_data.pop('uploaded_file', None)
        instance = super().create(validated_data)
        return instance
