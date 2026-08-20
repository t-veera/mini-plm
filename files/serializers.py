from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from .models import File, FileRevision, Product, Stage, Iteration, Folder

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
    # Optional: model.save() defaults a blank name to the generated id (S1, S2, ...).
    name = serializers.CharField(required=False, allow_blank=True, max_length=100)

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
    # Optional: model.save() defaults a blank name to the generated id (I1, I2, ...).
    name = serializers.CharField(required=False, allow_blank=True, max_length=100)

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

class FolderSerializer(serializers.ModelSerializer):
    """Serializer for folder CRUD (create, rename, move, delete).

    Folders are scoped to a single stage/iteration. On create the caller passes
    stage_id or iteration_id; product is derived from that container.
    """
    stage_id = serializers.IntegerField(write_only=True, required=False)
    iteration_id = serializers.IntegerField(write_only=True, required=False)
    container_type = serializers.CharField(read_only=True)

    class Meta:
        model = Folder
        fields = ['id', 'name', 'parent', 'product', 'container_type', 'created_at', 'updated_at', 'stage_id', 'iteration_id']
        read_only_fields = ['id', 'product', 'container_type', 'created_at', 'updated_at']

    def _target_container(self, data):
        """(content_type_id, object_id) the folder should live in, for create or update."""
        stage_id = data.get('stage_id')
        iteration_id = data.get('iteration_id')
        if stage_id:
            return ContentType.objects.get_for_model(Stage).id, stage_id
        if iteration_id:
            return ContentType.objects.get_for_model(Iteration).id, iteration_id
        if self.instance:
            return self.instance.content_type_id, self.instance.object_id
        return None, None

    def validate(self, data):
        """Keep a subfolder in the same container as its parent; block cycles on move."""
        parent = data.get('parent', getattr(self.instance, 'parent', None) if self.instance else None)

        if parent:
            ct_id, obj_id = self._target_container(data)
            if ct_id and (parent.content_type_id != ct_id or parent.object_id != obj_id):
                raise serializers.ValidationError("Parent folder must be in the same stage/iteration.")

            if self.instance:
                node = parent
                while node is not None:
                    if node.id == self.instance.id:
                        raise serializers.ValidationError("Cannot move a folder into its own descendant.")
                    node = node.parent

        return data

    def create(self, validated_data):
        stage_id = validated_data.pop('stage_id', None)
        iteration_id = validated_data.pop('iteration_id', None)

        container = None
        if stage_id:
            container = Stage.objects.filter(id=stage_id).first()
            if not container:
                raise serializers.ValidationError("Stage not found.")
        elif iteration_id:
            container = Iteration.objects.filter(id=iteration_id).first()
            if not container:
                raise serializers.ValidationError("Iteration not found.")
        else:
            raise serializers.ValidationError("Either stage_id or iteration_id must be provided.")

        validated_data['content_object'] = container
        validated_data['product'] = container.product
        return super().create(validated_data)

class FolderTreeSerializer(serializers.ModelSerializer):
    """Read-only recursive serializer for the tree endpoint.

    Expects the view to have attached `_prefetched_children` (list of Folder instances)
    and an annotated `file_count` to each instance up front, so building the tree costs
    a fixed number of queries regardless of depth/breadth (no N+1 recursion).
    """
    children = serializers.SerializerMethodField()
    file_count = serializers.SerializerMethodField()
    container_type = serializers.CharField(read_only=True)

    class Meta:
        model = Folder
        fields = ['id', 'name', 'parent', 'product', 'container_type', 'created_at', 'updated_at', 'children', 'file_count']

    def get_children(self, obj):
        return FolderTreeSerializer(getattr(obj, '_prefetched_children', []), many=True, context=self.context).data

    def get_file_count(self, obj):
        return getattr(obj, 'file_count', 0)

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
            'category',
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
            'folder',
            'is_child_file',
            'current_revision',
            'status',
            'quantity',
            'price',
            'category',
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
        # Only validate stage_id/iteration_id and container relationships for new file creation
        if not self.instance:  # CREATE operation
            stage_id = data.get('stage_id')
            iteration_id = data.get('iteration_id')

            # Must provide either stage_id OR iteration_id, but not both
            if not stage_id and not iteration_id:
                raise serializers.ValidationError("Either stage_id or iteration_id must be provided.")

            if stage_id and iteration_id:
                raise serializers.ValidationError("Cannot provide both stage_id and iteration_id. Choose one.")

            # Validate parent file relationship (only during creation)
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

            folder = data.get('folder')
            if folder:
                ct, obj_id = None, None
                if stage_id:
                    ct = ContentType.objects.get_for_model(Stage).id
                    obj_id = stage_id
                elif iteration_id:
                    ct = ContentType.objects.get_for_model(Iteration).id
                    obj_id = iteration_id
                if ct and (folder.content_type_id != ct or folder.object_id != obj_id):
                    raise serializers.ValidationError("Folder must be in the same stage/iteration as the file.")

        else:  # UPDATE operation
            # Only validate parent_file nesting if parent_file is being updated
            parent_file = data.get('parent_file')
            if parent_file is not None:  # Only if parent_file is explicitly being changed
                if parent_file.parent_file:
                    raise serializers.ValidationError("Cannot create a child file of a child file. Only one level of nesting is allowed.")

            folder = data.get('folder')
            if folder is not None:
                if folder.content_type_id != self.instance.content_type_id or folder.object_id != self.instance.object_id:
                    raise serializers.ValidationError("Folder must be in the same stage/iteration as the file.")

            # A filename identifies one file within a stage/iteration, whatever folder it
            # sits in -- uploading that name versions the file already holding it. A rename
            # is the one path that could still mint a second row under an existing name,
            # which would leave later uploads with two candidates. Refuse it, and point at
            # the upload that does what the user is actually after.
            new_name = data.get('name')
            if new_name and new_name != self.instance.name and not self.instance.parent_file_id:
                clash = File.objects.filter(
                    name=new_name,
                    content_type_id=self.instance.content_type_id,
                    object_id=self.instance.object_id,
                    parent_file__isnull=True,
                ).exclude(pk=self.instance.pk).exists()
                if clash:
                    raise serializers.ValidationError(
                        '"%s" already exists in this stage/iteration. Upload your file over '
                        'that one to add it as a new version, instead of renaming this into '
                        'a duplicate.' % new_name
                    )

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