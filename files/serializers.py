from rest_framework import serializers
from .models import File, FileRevision, Product, Stage

class FileRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileRevision
        fields = [
            'revision_number',
            'uploaded_file',
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
            'uploaded_file',
            'metadata',
            'revisions',
            'stage',
        ]
        read_only_fields = ['id', 'owner', 'upload_date', 'file_path']

class StageSerializer(serializers.ModelSerializer):
    files = FileSerializer(many=True, read_only=True)

    class Meta:
        model = Stage
        fields = ['id', 'product', 'label', 'type', 'color', 'order', 'files']

class ProductSerializer(serializers.ModelSerializer):
    stages = StageSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = ['id', 'name', 'created_at', 'owner', 'stages']
