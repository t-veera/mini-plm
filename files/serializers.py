from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from .models import File, FileRevision, Product, Stage, Iteration

class UserSerializer(serializers.ModelSerializer):
    """Simple user serializer for owner information"""
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']
        read_only_fields = ['id']

class FileRevisionSerializer(serializers.ModelSerializer):
    """Serializer for file revisions"""
    created_by = UserSerializer(read_only=True)
    file_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = FileRevision
        fields = [
            'id',
            'revision_number',
            'uploaded_file',
            'file_path',
            'file_size',
            'file_size_mb',
            'description',
            'status',
            'price',
            'created_at',
            'created_by',
        ]
        read_only_fields = ['id', 'revision_number', 'file_path', 'file_size', 'created_at']

    def get_file_size_mb(self, obj):
        """Convert file size to MB"""
        if obj.file_size:
            return round(obj.file_size / (1024 * 1024), 2)
        return None

class StageSerializer(serializers.ModelSerializer):
    """Serializer for stages"""
    stage_id = serializers.CharField(read_only=True)
    
    class Meta:
        model = Stage
        fields = [
            'id',
            'product',
            'name',
            'description',
            'stage_number',
            'stage_id',
            'type',
            'color',
            'order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'stage_number', 'stage_id', 'created_at', 'updated_at']

class IterationSerializer(serializers.ModelSerializer):
    """Serializer for iterations"""
    iteration_id = serializers.CharField(read_only=True)
    
    class Meta:
        model = Iteration
        fields = [
            'id',
            'product',
            'name',
            'description',
            'iteration_number',
            'iteration_id',
            'type',
            'color',
            'order',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'iteration_number', 'iteration_id', 'created_at', 'updated_at']

class ChildFileSerializer(serializers.ModelSerializer):
    """Serializer for child files (nested under parent files)"""
    latest_revision = FileRevisionSerializer(read_only=True)
    revisions = FileRevisionSerializer(many=True, read_only=True)
    file_size_mb = serializers.SerializerMethodField()
    owner = UserSerializer(read_only=True)
    container_type = serializers.CharField(read_only=True)
    container_id = serializers.CharField(read_only=True)
    
    class Meta:
        model = File
        fields = [
            'id',
            'name',
            'description',
            'file_type',
            'uploaded_file',
            'file_path',
            'file_size',
            'file_size_mb',
            'container_type',
            'container_id',
            'current_revision',
            'status',
            'quantity',
            'price',
            'metadata',
            'created_at',
            'updated_at',
            'owner',
            'latest_revision',
            'revisions',
        ]
        read_only_fields = [
            'id', 'file_path', 'file_size', 'current_revision', 
            'created_at', 'updated_at', 'owner', 'container_type', 'container_id'
        ]

    def get_file_size_mb(self, obj):
        """Convert file size to MB"""
        if obj.file_size:
            return round(obj.file_size / (1024 * 1024), 2)
        return None

class FileSerializer(serializers.ModelSerializer):
    """Main file serializer"""
    # Nested serializers
    child_files = ChildFileSerializer(many=True, read_only=True)
    latest_revision = FileRevisionSerializer(read_only=True)
    revisions = FileRevisionSerializer(many=True, read_only=True)
    owner = UserSerializer(read_only=True)
    
    # Computed fields
    file_size_mb = serializers.SerializerMethodField()
    container_type = serializers.CharField(read_only=True)
    container_id = serializers.CharField(read_only=True)
    container_db_id = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    product_id = serializers.SerializerMethodField()
    is_child_file = serializers.BooleanField(read_only=True)
    file_extension = serializers.CharField(read_only=True)
    
    # Write fields for creating files
    uploaded_file = serializers.FileField(write_only=True, required=False)
    stage_id = serializers.IntegerField(write_only=True, required=False)
    iteration_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = File
        fields = [
            'id',
            'name',
            'description',
            'file_type',
            'uploaded_file',
            'file_path',
            'file_size',
            'file_size_mb',
            'file_extension',
            'container_type',
            'container_id',
            'container_db_id',
            'product_id',
            'product_name',
            'parent_file',
            'is_child_file',
            'current_revision',
            'status',
            'quantity',
            'price',
            'metadata',
            'created_at',
            'updated_at',
            'owner',
            'child_files',
            'latest_revision',
            'revisions',
            # Write-only fields
            'stage_id',
            'iteration_id',
        ]
        read_only_fields = [
            'id', 'file_path', 'file_size', 'file_extension', 'current_revision',
            'created_at', 'updated_at', 'owner', 'is_child_file', 'container_type',
            'container_id', 'container_db_id', 'product_id', 'product_name'
        ]

    def get_container_db_id(self, obj):
        """Get the database ID of the container"""
        if isinstance(obj.content_object, Stage):
            return obj.content_object.id
        elif isinstance(obj.content_object, Iteration):
            return obj.content_object.id
        return None

    def get_file_size_mb(self, obj):
        """Convert file size to MB"""
        if obj.file_size:
            return round(obj.file_size / (1024 * 1024), 2)
        return None

    def get_product_name(self, obj):
        """Get product name"""
        if obj.content_object and hasattr(obj.content_object, 'product'):
            return obj.content_object.product.name
        return None

    def get_product_id(self, obj):
        """Get product ID"""
        if obj.content_object and hasattr(obj.content_object, 'product'):
            return obj.content_object.product.id
        return None

    def validate(self, data):
        """Cross-field validation"""
        stage_id = data.get('stage_id')
        iteration_id = data.get('iteration_id')
        
        # Must provide either stage_id OR iteration_id, but not both
        if not stage_id and not iteration_id:
            raise serializers.ValidationError("Either stage_id or iteration_id must be provided.")
        
        if stage_id and iteration_id:
            raise serializers.ValidationError("Cannot provide both stage_id and iteration_id. Choose one.")
        
        # Validate parent file relationship
        parent_file = data.get('parent_file')
        if parent_file:
            if parent_file.parent_file:
                raise serializers.ValidationError("Cannot create a child file of a child file. Only one level of nesting is allowed.")
            
            # Ensure parent file is in the same container
            if stage_id and parent_file.content_object and isinstance(parent_file.content_object, Stage):
                if parent_file.content_object.id != stage_id:
                    raise serializers.ValidationError("Child file must be in the same stage as parent file.")
            elif iteration_id and parent_file.content_object and isinstance(parent_file.content_object, Iteration):
                if parent_file.content_object.id != iteration_id:
                    raise serializers.ValidationError("Child file must be in the same iteration as parent file.")
        
        return data

    def create(self, validated_data):
        """Create a new file instance"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['owner'] = request.user
        
        # Handle stage or iteration assignment
        stage_id = validated_data.pop('stage_id', None)
        iteration_id = validated_data.pop('iteration_id', None)
        
        if stage_id:
            try:
                stage = Stage.objects.get(id=stage_id)
                validated_data['content_object'] = stage
            except Stage.DoesNotExist:
                raise serializers.ValidationError("Stage not found.")
        elif iteration_id:
            try:
                iteration = Iteration.objects.get(id=iteration_id)
                validated_data['content_object'] = iteration
            except Iteration.DoesNotExist:
                raise serializers.ValidationError("Iteration not found.")
        
        return super().create(validated_data)

class ProductSerializer(serializers.ModelSerializer):
    """Product serializer with nested stages and iterations"""
    stages = StageSerializer(many=True, read_only=True)
    iterations = IterationSerializer(many=True, read_only=True)
    owner = UserSerializer(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id',
            'name', 
            'description',
            'created_at',
            'updated_at',
            'owner',
            'stages',
            'iterations'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner']