from rest_framework import serializers
from .models import File, FileRevision, Product, Stage

class FileRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FileRevision
        fields = [
            'id',
            'revision_number',
            'uploaded_file',
            'file_path',
            'upload_date',
            'change_description',
            'status',
            'price',
        ]

class ChildFileSerializer(serializers.ModelSerializer):
    revisions = FileRevisionSerializer(many=True, read_only=True)
    latest_revision = FileRevisionSerializer(read_only=True)

    class Meta:
        model = File
        fields = [
            'id',
            'name',
            'upload_date',
            'file_path',
            'metadata',
            'parent_file',
            'parent_revision',
            'is_child_file',
            'status',
            'price',
            'quantity',
            'current_revision',
            'revisions',
            'latest_revision',
        ]

class FileSerializer(serializers.ModelSerializer):
    uploaded_file = serializers.FileField(write_only=True, required=False)
    stage = serializers.PrimaryKeyRelatedField(queryset=Stage.objects.all(), required=True)
    revisions = FileRevisionSerializer(many=True, read_only=True)
    child_files = ChildFileSerializer(many=True, read_only=True)
    latest_revision = FileRevisionSerializer(read_only=True)
    upload_date = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()
    owner = serializers.ReadOnlyField()

    class Meta:
        model = File
        fields = [
            'id',
            'name',
            'upload_date',
            'file_path',
            'uploaded_file',
            'metadata',
            'stage',
            'parent_file',
            'parent_revision',
            'is_child_file',
            'status',
            'price',
            'quantity',
            'current_revision',
            'revisions',
            'child_files',
            'latest_revision',
            'product',
            'owner',
        ]
        read_only_fields = ['id', 'owner', 'upload_date', 'file_path']

    def get_upload_date(self, obj):
        latest_rev = obj.latest_revision
        return latest_rev.upload_date if latest_rev else obj.upload_date

    def get_product(self, obj):
        return obj.stage.product.id if obj.stage else None

    def validate_stage(self, value):
        if not value:
            raise serializers.ValidationError("Stage must be provided.")
        return value

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['owner'] = request.user
        return super().create(validated_data)

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
        read_only_fields = ['owner']
