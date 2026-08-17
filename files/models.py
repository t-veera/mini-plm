from django.db import models
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
import os

# --- File categorization (single source of truth for BOM binning) -----------------
# Extension -> category. The category is user-overridable; extension is only the default
# guess used at upload time. Keep this map in sync with the data migration that backfills
# existing rows (the migration inlines an identical copy to stay self-contained/historical).
ELECTRONICS_EXTS = {'kicad_sch', 'kicad_pcb', 'sch', 'brd', 'gbr', 'gerber', 'net'}
MECHANICAL_EXTS = {'step', 'stp', 'stl', 'dxf', 'f3d', 'iges', 'igs',
                   'sldprt', 'sldasm', 'ipt', 'iam', '3mf', 'obj'}


def category_for_extension(ext):
    """Classify a file into electronics / mechanical / misc from its extension.

    Everything not explicitly electronics or mechanical (including xls/xlsx/csv) is misc.
    """
    if not ext:
        return 'misc'
    ext = ext.lower().lstrip('.')
    if ext in ELECTRONICS_EXTS:
        return 'electronics'
    if ext in MECHANICAL_EXTS:
        return 'mechanical'
    return 'misc'


def upload_to_revision(instance, filename):
    """Generate upload path for file revisions following product hierarchy"""
    try:
        if not instance.file:
            return f"uploads/unknown/revisions/{filename}"

        # Get the parent file's info
        parent_file = instance.file
        product_name = "unknown_product"
        product_id = "unknown"

        if parent_file.content_object and hasattr(parent_file.content_object, 'product'):
            product = parent_file.content_object.product
            if product and product.name:  # Check if product.name exists and is not None
                # Clean product name for filesystem
                product_name = ''.join(c for c in str(product.name) if c.isalnum() or c in (' ', '-', '_')).rstrip()
                product_name = product_name.replace(' ', '_').lower() or "unknown_product"  # Fallback if empty
                product_id = product.id

        # Get container info using stage/iteration numbers for consistency
        container_id = "unknown_container"
        if hasattr(parent_file.content_object, 'stage_number'):
            container_id = f"stage_{parent_file.content_object.stage_number}"
        elif hasattr(parent_file.content_object, 'iteration_number'):
            container_id = f"iteration_{parent_file.content_object.iteration_number}"

        # Create revision filename with revision number
        base_filename = os.path.basename(filename)
        name, ext = os.path.splitext(base_filename)
        revision_filename = f"{name}_rev{instance.revision_number or 'unknown'}{ext}"

        return f"uploads/product_{product_id}_{product_name}/{container_id}/revisions/{revision_filename}"
    except Exception:
        # Fallback to simple path if anything goes wrong
        return f"uploads/revisions/{filename}"

def upload_to_file(instance, filename):
    """Generate upload path for original files following product hierarchy"""
    try:
        # Get product info
        product_name = "unknown_product"
        product_id = "unknown"

        if instance.content_object and hasattr(instance.content_object, 'product'):
            product = instance.content_object.product
            if product and product.name:  # Check if product.name exists and is not None
                # Clean product name for filesystem
                product_name = ''.join(c for c in str(product.name) if c.isalnum() or c in (' ', '-', '_')).rstrip()
                product_name = product_name.replace(' ', '_').lower() or "unknown_product"  # Fallback if empty
                product_id = product.id

        # Get container info using stage/iteration numbers for consistency
        container_id = "unknown_container"
        if hasattr(instance.content_object, 'stage_number'):
            container_id = f"stage_{instance.content_object.stage_number}"
        elif hasattr(instance.content_object, 'iteration_number'):
            container_id = f"iteration_{instance.content_object.iteration_number}"

        base_filename = os.path.basename(filename)
        return f"uploads/product_{product_id}_{product_name}/{container_id}/{base_filename}"
    except Exception:
        # Fallback to simple path if anything goes wrong
        return f"uploads/{filename}"

class Product(models.Model):
    """Product model - each user can have multiple products"""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='products')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

class Stage(models.Model):
    """Stage model - each product can have multiple stages with S1, S2, S3... IDs"""
    STAGE_TYPES = [
        ('workflow', 'Workflow'),
        ('approval', 'Approval'),
        ('review', 'Review'),
        ('development', 'Development'),
        ('testing', 'Testing'),
        ('production', 'Production'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stages')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    stage_number = models.IntegerField()  # This will be used to generate S1, S2, S3...
    type = models.CharField(max_length=20, choices=STAGE_TYPES, default='workflow')
    color = models.CharField(max_length=7, default='#007bff')  # Hex color for UI
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'stage_number']
        unique_together = [['product', 'stage_number'], ['product', 'name']]

    @property
    def stage_id(self):
        """Generate stage ID like S1, S2, S3..."""
        return f"S{self.stage_number}"

    def __str__(self):
        return f"{self.product.name} - {self.stage_id} ({self.name})"

    def save(self, *args, **kwargs):
        # Auto-generate stage_number if not provided
        if not self.stage_number:
            last_stage = Stage.objects.filter(product=self.product).order_by('-stage_number').first()
            self.stage_number = (last_stage.stage_number + 1) if last_stage else 1
        # Default the name to the generated id (S1, S2, ...) when none was given.
        if not (self.name or '').strip():
            self.name = f"S{self.stage_number}"
        super().save(*args, **kwargs)

class Iteration(models.Model):
    """Iteration model - each product can have multiple iterations with I1, I2, I3... IDs"""
    ITERATION_TYPES = [
        ('design', 'Design'),
        ('prototype', 'Prototype'),
        ('testing', 'Testing'),
        ('refinement', 'Refinement'),
        ('final', 'Final'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='iterations')
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    iteration_number = models.IntegerField()  # This will be used to generate I1, I2, I3...
    type = models.CharField(max_length=20, choices=ITERATION_TYPES, default='design')
    color = models.CharField(max_length=7, default='#28a745')  # Hex color for UI
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'iteration_number']
        unique_together = [['product', 'iteration_number'], ['product', 'name']]

    @property
    def iteration_id(self):
        """Generate iteration ID like I1, I2, I3..."""
        return f"I{self.iteration_number}"

    def __str__(self):
        return f"{self.product.name} - {self.iteration_id} ({self.name})"

    def save(self, *args, **kwargs):
        # Auto-generate iteration_number if not provided
        if not self.iteration_number:
            last_iteration = Iteration.objects.filter(product=self.product).order_by('-iteration_number').first()
            self.iteration_number = (last_iteration.iteration_number + 1) if last_iteration else 1
        # Default the name to the generated id (I1, I2, ...) when none was given.
        if not (self.name or '').strip():
            self.name = f"I{self.iteration_number}"
        super().save(*args, **kwargs)

class Folder(models.Model):
    """Folder model - scoped to a single Stage OR Iteration, supports unbounded nesting.

    Folders belong to one container (stage/iteration) via the generic FK below, mirroring
    how File is attached, so each iteration/stage has its own independent folders. `product`
    is retained (derived from the container) for convenient product-wide queries.

    parent uses on_delete=PROTECT as a DB-level backstop: the API blocks deleting a
    non-empty folder with a friendly error, and PROTECT ensures that invariant holds
    even if a folder is ever deleted outside that guarded path (e.g. Django admin/shell).
    """
    name = models.CharField(max_length=255)
    parent = models.ForeignKey('self', on_delete=models.PROTECT, null=True, blank=True, related_name='children')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='folders')

    # Container (Stage OR Iteration) this folder lives in. Nullable only so the migration
    # can add the column before backfilling; new folders always set it.
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True, related_name='folders')
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    @property
    def container_type(self):
        if isinstance(self.content_object, Stage):
            return 'stage'
        elif isinstance(self.content_object, Iteration):
            return 'iteration'
        return None

class File(models.Model):
    """File model - can belong to either a Stage OR an Iteration"""
    FILE_TYPES = [
        # Documents
        ('pdf', 'PDF'),
        ('doc', 'Word Document'),
        ('docx', 'Word Document (DOCX)'),
        ('txt', 'Text File'),

        # Spreadsheets
        ('xls', 'Excel Spreadsheet'),
        ('xlsx', 'Excel Spreadsheet (XLSX)'),
        ('csv', 'CSV File'),

        # Presentations
        ('ppt', 'PowerPoint'),
        ('pptx', 'PowerPoint (PPTX)'),

        # Images
        ('jpg', 'JPEG Image'),
        ('jpeg', 'JPEG Image'),
        ('png', 'PNG Image'),
        ('gif', 'GIF Image'),
        ('bmp', 'BMP Image'),
        ('svg', 'SVG Image'),
        ('tiff', 'TIFF Image'),

        # Programming Files
        ('c', 'C Source Code'),
        ('cpp', 'C++ Source Code'),
        ('cxx', 'C++ Source Code'),
        ('cc', 'C++ Source Code'),
        ('h', 'C/C++ Header File'),
        ('hpp', 'C++ Header File'),
        ('py', 'Python Script'),
        ('js', 'JavaScript'),
        ('ts', 'TypeScript'),
        ('java', 'Java Source Code'),
        ('cs', 'C# Source Code'),
        ('php', 'PHP Script'),
        ('rb', 'Ruby Script'),
        ('go', 'Go Source Code'),
        ('rs', 'Rust Source Code'),
        ('swift', 'Swift Source Code'),
        ('kt', 'Kotlin Source Code'),
        ('scala', 'Scala Source Code'),
        ('pl', 'Perl Script'),
        ('sh', 'Shell Script'),
        ('bat', 'Batch File'),
        ('ps1', 'PowerShell Script'),

        # Microcontroller/IoT
        ('ino', 'Arduino Sketch'),
        ('pde', 'Processing/Arduino'),
        ('uf2', 'UF2 Firmware'),
        ('hex', 'Intel HEX File'),
        ('bin', 'Binary File'),
        ('elf', 'ELF Executable'),

        # MicroPython
        ('mpy', 'MicroPython Bytecode'),

        # 3D Models
        ('stl', 'STL 3D Model'),
        ('stp', 'STEP 3D Model'),
        ('step', 'STEP 3D Model'),
        ('iges', 'IGES 3D Model'),
        ('igs', 'IGES 3D Model'),
        ('obj', 'OBJ 3D Model'),
        ('3mf', '3MF 3D Model'),
        ('ply', 'PLY 3D Model'),
        ('fbx', 'FBX 3D Model'),
        ('dae', 'COLLADA 3D Model'),
        ('blend', 'Blender File'),
        ('max', '3ds Max File'),
        ('ma', 'Maya ASCII File'),
        ('mb', 'Maya Binary File'),

        # CAD Files
        ('dwg', 'AutoCAD Drawing'),
        ('dxf', 'DXF Drawing'),
        ('dwf', 'Design Web Format'),
        ('ipt', 'Inventor Part'),
        ('iam', 'Inventor Assembly'),
        ('idw', 'Inventor Drawing'),
        ('prt', 'SolidWorks/NX Part'),
        ('asm', 'SolidWorks Assembly'),
        ('sldprt', 'SolidWorks Part'),
        ('sldasm', 'SolidWorks Assembly'),
        ('slddrw', 'SolidWorks Drawing'),

        # KiCad Files
        ('kicad_pro', 'KiCad Project'),
        ('kicad_sch', 'KiCad Schematic'),
        ('kicad_pcb', 'KiCad PCB'),
        ('lib', 'KiCad Symbol Library'),
        ('dcm', 'KiCad Component Documentation'),
        ('pretty', 'KiCad Footprint Library'),
        ('kicad_mod', 'KiCad Footprint'),
        ('net', 'KiCad Netlist'),
        ('cmp', 'KiCad Component List'),

        # Electronics/PCB (Other)
        ('brd', 'Eagle Board'),
        ('sch', 'Eagle/Generic Schematic'),
        ('lbr', 'Eagle Library'),
        ('gerber', 'Gerber File'),
        ('gbr', 'Gerber File'),
        ('drl', 'Drill File'),
        ('nc', 'NC Drill File'),
        ('gcode', 'G-Code'),

        # Archives
        ('zip', 'ZIP Archive'),
        ('rar', 'RAR Archive'),
        ('7z', '7-Zip Archive'),
        ('tar', 'TAR Archive'),
        ('gz', 'GZIP Archive'),

        # Configuration/Data
        ('json', 'JSON Data'),
        ('xml', 'XML Data'),
        ('yaml', 'YAML Data'),
        ('yml', 'YAML Data'),
        ('toml', 'TOML Data'),
        ('ini', 'INI Configuration'),
        ('cfg', 'Configuration File'),
        ('conf', 'Configuration File'),

        # Other
        ('md', 'Markdown'),
        ('rst', 'reStructuredText'),
        ('log', 'Log File'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('in_work', 'In Work'),
        ('pending_review', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('final', 'Final'),
    ]

    CATEGORY_CHOICES = [
        ('electronics', 'Electronics'),
        ('mechanical', 'Mechanical'),
        ('misc', 'Misc'),
    ]

    # Basic file information
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    file_type = models.CharField(max_length=20, choices=FILE_TYPES, default='other')

    # File storage
    uploaded_file = models.FileField(upload_to=upload_to_file, blank=True, null=True)
    file_path = models.CharField(max_length=500, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)  # Size in bytes

    # Generic relationship to Stage OR Iteration
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    # Owner
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='files')

    # Parent-child relationship
    parent_file = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='child_files')

    # Folder placement (organizational only - independent of stage/iteration tagging above).
    # null = root-level / unfiled. SET_NULL so a folder deletion never deletes files.
    folder = models.ForeignKey(Folder, on_delete=models.SET_NULL, null=True, blank=True, related_name='files')

    # File metadata
    current_revision = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_work')
    quantity = models.IntegerField(default=1, help_text="Quantity for this file")
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Price for this file")
    # BOM binning: electronics / mechanical / misc. Defaults to a guess from the file
    # extension on upload (see FileViewSet.create); user-overridable via PATCH.
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='misc',
                                help_text="BOM category (electronics/mechanical/misc)")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Additional metadata (JSON field for flexible data)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.name

    @property
    def is_child_file(self):
        """Check if this file is a child file"""
        return self.parent_file is not None

    @property
    def latest_revision(self):
        """Get the latest revision of this file"""
        return self.revisions.order_by('-revision_number').first()

    @property
    def file_extension(self):
        """Get file extension from uploaded file"""
        if self.uploaded_file:
            return os.path.splitext(self.uploaded_file.name)[1].lower().lstrip('.')
        return None

    @property
    def stage(self):
        """Get stage if this file belongs to a stage"""
        if isinstance(self.content_object, Stage):
            return self.content_object
        return None

    @property
    def iteration(self):
        """Get iteration if this file belongs to an iteration"""
        if isinstance(self.content_object, Iteration):
            return self.content_object
        return None

    @property
    def container_type(self):
        """Get container type (stage or iteration)"""
        if isinstance(self.content_object, Stage):
            return 'stage'
        elif isinstance(self.content_object, Iteration):
            return 'iteration'
        return None

    @property
    def container_id(self):
        """Get container ID (S1, S2... or I1, I2...)"""
        if isinstance(self.content_object, Stage):
            return self.content_object.stage_id
        elif isinstance(self.content_object, Iteration):
            return self.content_object.iteration_id
        return None

    @property
    def product(self):
        """Get the product this file belongs to"""
        if self.content_object:
            return self.content_object.product
        return None

    def save(self, *args, **kwargs):
        # Auto-detect file type from extension
        if self.uploaded_file and (not self.file_type or self.file_type == 'other'):
            ext = self.file_extension
            if ext:
                # Extended mapping for all file types
                ext_mapping = {
                    # Documents
                    'pdf': 'pdf',
                    'doc': 'doc',
                    'docx': 'docx',
                    'txt': 'txt',

                    # Spreadsheets
                    'xls': 'xls',
                    'xlsx': 'xlsx',
                    'csv': 'csv',

                    # Presentations
                    'ppt': 'ppt',
                    'pptx': 'pptx',

                    # Images
                    'jpg': 'jpg',
                    'jpeg': 'jpeg',
                    'png': 'png',
                    'gif': 'gif',
                    'bmp': 'bmp',
                    'svg': 'svg',
                    'tiff': 'tiff',

                    # Programming Files
                    'c': 'c',
                    'cpp': 'cpp',
                    'cxx': 'cxx',
                    'cc': 'cc',
                    'h': 'h',
                    'hpp': 'hpp',
                    'py': 'py',
                    'js': 'js',
                    'ts': 'ts',
                    'java': 'java',
                    'cs': 'cs',
                    'php': 'php',
                    'rb': 'rb',
                    'go': 'go',
                    'rs': 'rs',
                    'swift': 'swift',
                    'kt': 'kt',
                    'scala': 'scala',
                    'pl': 'pl',
                    'sh': 'sh',
                    'bat': 'bat',
                    'ps1': 'ps1',

                    # Microcontroller/IoT
                    'ino': 'ino',
                    'pde': 'pde',
                    'uf2': 'uf2',
                    'hex': 'hex',
                    'bin': 'bin',
                    'elf': 'elf',
                    'mpy': 'mpy',

                    # 3D Models
                    'stl': 'stl',
                    'stp': 'stp',
                    'step': 'step',
                    'iges': 'iges',
                    'igs': 'igs',
                    'obj': 'obj',
                    '3mf': '3mf',
                    'ply': 'ply',
                    'fbx': 'fbx',
                    'dae': 'dae',
                    'blend': 'blend',
                    'max': 'max',
                    'ma': 'ma',
                    'mb': 'mb',

                    # CAD Files
                    'dwg': 'dwg',
                    'dxf': 'dxf',
                    'dwf': 'dwf',
                    'ipt': 'ipt',
                    'iam': 'iam',
                    'idw': 'idw',
                    'prt': 'prt',
                    'asm': 'asm',
                    'sldprt': 'sldprt',
                    'sldasm': 'sldasm',
                    'slddrw': 'slddrw',

                    # KiCad Files
                    'kicad_pro': 'kicad_pro',
                    'kicad_sch': 'kicad_sch',
                    'kicad_pcb': 'kicad_pcb',
                    'lib': 'lib',
                    'dcm': 'dcm',
                    'pretty': 'pretty',
                    'kicad_mod': 'kicad_mod',
                    'net': 'net',
                    'cmp': 'cmp',

                    # Electronics/PCB (Other)
                    'brd': 'brd',
                    'sch': 'sch',
                    'lbr': 'lbr',
                    'gerber': 'gerber',
                    'gbr': 'gbr',
                    'drl': 'drl',
                    'nc': 'nc',
                    'gcode': 'gcode',

                    # Archives
                    'zip': 'zip',
                    'rar': 'rar',
                    '7z': '7z',
                    'tar': 'tar',
                    'gz': 'gz',

                    # Configuration/Data
                    'json': 'json',
                    'xml': 'xml',
                    'yaml': 'yaml',
                    'yml': 'yml',
                    'toml': 'toml',
                    'ini': 'ini',
                    'cfg': 'cfg',
                    'conf': 'conf',

                    # Other
                    'md': 'md',
                    'rst': 'rst',
                    'log': 'log',
                }
                self.file_type = ext_mapping.get(ext, 'other')

        # Set file size (Django FileField already set correct file_path via upload_to_file)
        if self.uploaded_file:
            self.file_path = self.uploaded_file.name
            if hasattr(self.uploaded_file, 'size'):
                self.file_size = self.uploaded_file.size

        super().save(*args, **kwargs)

class FileRevision(models.Model):
    """File revision model - each file can have multiple revisions"""
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name='revisions')
    revision_number = models.IntegerField()

    # File storage for this revision
    uploaded_file = models.FileField(upload_to=upload_to_revision)
    file_path = models.CharField(max_length=500, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)

    # Revision metadata
    description = models.TextField(blank=True, null=True, help_text="Description of changes in this revision")
    status = models.CharField(max_length=20, choices=File.STATUS_CHOICES, default='in_work')
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ['file', 'revision_number']
        ordering = ['-revision_number']

    def __str__(self):
        return f"{self.file.name} - Rev {self.revision_number}"

    def save(self, *args, **kwargs):
        # Auto-increment revision number if not set
        if not self.revision_number:
            last_revision = FileRevision.objects.filter(file=self.file).order_by('-revision_number').first()
            self.revision_number = (last_revision.revision_number + 1) if last_revision else 1

        # Set file size (Django FileField already set correct file_path via upload_to_revision)
        if self.uploaded_file:
            if hasattr(self.uploaded_file, 'size'):
                self.file_size = self.uploaded_file.size

        super().save(*args, **kwargs)

        # Update parent file's current revision
        if self.file:
            self.file.current_revision = self.revision_number
            self.file.save(update_fields=['current_revision', 'updated_at'])


# --- Traceability index -----------------------------------------------------------
# TraceNode/TraceEdge are a DISPOSABLE index over the markdown files themselves. The
# files are the source of truth; every row here is rebuilt by files.traceability.parse
# from the file it came from. Dropping both tables loses nothing that a reparse can't
# reproduce. Status (GREEN/YELLOW/RED) is deliberately NOT stored: it depends on the
# iteration being viewed, so it is computed at read time.

class TraceNode(models.Model):
    """One requirement/risk/spec/test ID declared inside one markdown file."""
    NODE_TYPES = [
        ('PRD', 'Product Requirement'),
        ('ARCH', 'Architecture'),
        ('RISK', 'Risk / FMEA'),
        ('SRS', 'Software/System Requirement Spec'),
        ('VERIF', 'Verification'),
        ('VAL', 'Validation'),
    ]

    TEST_STATUSES = [
        ('PASS', 'Pass'),
        ('FAIL', 'Fail'),
    ]

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='trace_nodes')
    # The container the source file was uploaded to. A doc can live in an Iteration OR a
    # Stage, so exactly one of these two is set and `source_container_key` carries the
    # combined identity. Read-time inheritance walks the continuous IIL order across
    # both (see traceability/containers.py), which is ordered by container created_at --
    # the same total order the container rail and the BOM scope selector already use.
    source_iteration = models.ForeignKey(Iteration, on_delete=models.CASCADE,
                                         null=True, blank=True, related_name='trace_nodes')
    source_stage = models.ForeignKey(Stage, on_delete=models.CASCADE,
                                     null=True, blank=True, related_name='trace_nodes')
    # 'iteration:3' / 'stage:1'. Always set. Uniqueness keys off this rather than the two
    # nullable FKs, because SQL treats NULLs as distinct and would stop enforcing it.
    source_container_key = models.CharField(max_length=32, db_index=True, default='')
    source_file = models.ForeignKey(File, on_delete=models.CASCADE, related_name='trace_nodes')

    node_type = models.CharField(max_length=8, choices=NODE_TYPES)
    tag_id = models.CharField(max_length=64, help_text="ID as written in the doc, e.g. R001 / REQ-01")
    title = models.CharField(max_length=500, blank=True)
    source_line = models.PositiveIntegerField(default=0)
    snippet = models.TextField(blank=True)
    # Only ever set for VERIF/VAL nodes; null everywhere else.
    test_status = models.CharField(max_length=4, choices=TEST_STATUSES, null=True, blank=True)
    subsystem = models.CharField(max_length=120, null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['product', 'source_container_key', 'node_type', 'tag_id'],
                name='uniq_trace_node_per_container',
            ),
        ]
        ordering = ['node_type', 'tag_id']

    def __str__(self):
        return f"{self.node_type} {self.tag_id}"

    @property
    def source_container(self):
        """The Iteration or Stage this node's file was uploaded to."""
        return self.source_iteration or self.source_stage


class TraceEdge(models.Model):
    """A declared parent->child link, stored as canonical tag ids (not FKs).

    Tags are kept as plain strings because an edge is frequently written before the
    node it points at exists (or points into a doc from another iteration). Rebuilt in
    full every time the referencing file is parsed.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='trace_edges')
    parent_tag_id = models.CharField(max_length=64)
    child_tag_id = models.CharField(max_length=64)
    source_file = models.ForeignKey(File, on_delete=models.CASCADE, related_name='trace_edges')

    class Meta:
        ordering = ['parent_tag_id', 'child_tag_id']
        indexes = [
            models.Index(fields=['product', 'parent_tag_id']),
            models.Index(fields=['product', 'child_tag_id']),
        ]

    def __str__(self):
        return f"{self.parent_tag_id} -> {self.child_tag_id}"


class ManualTraceEdge(models.Model):
    """A link a person drew by hand between two trace IDs.

    A SECOND source of truth for edges, never a replacement: the graph is the union of
    these and the TraceEdge rows the parser writes. Parsed cross-references will always
    miss some real connections -- that is the documents' nature, not a bug -- and this is
    how they get fixed without editing the source document.

    Keyed by canonical tag string exactly as TraceEdge is, and deliberately NOT by
    TraceNode foreign key: reparsing a file deletes and rewrites its TraceNode rows, so
    FKs here would be cascade-deleted every time someone re-uploaded a document. Tags
    survive that; primary keys do not.

    Nothing removes these automatically. If a later doc edit makes the same connection
    parseable, both rows exist -- redundant, harmless, and cheaper than reconciling them.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='manual_trace_edges')
    parent_tag_id = models.CharField(max_length=64)
    child_tag_id = models.CharField(max_length=64)
    # Kept if the account is deleted: who drew it is history, the link itself is data.
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='manual_trace_edges')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['parent_tag_id', 'child_tag_id']
        constraints = [
            models.UniqueConstraint(
                fields=['product', 'parent_tag_id', 'child_tag_id'],
                name='uniq_manual_trace_edge',
            ),
        ]
        indexes = [
            models.Index(fields=['product', 'parent_tag_id']),
            models.Index(fields=['product', 'child_tag_id']),
        ]

    def __str__(self):
        return f"{self.parent_tag_id} -> {self.child_tag_id} (manual)"


class TraceMatrixPreference(models.Model):
    """Per-user, per-product layout of the traceability matrix.

    Server-side on purpose: the column preset is real configuration, so it has to
    survive a relogin and follow the user to another device. Unlike TraceNode/TraceEdge
    this is NOT disposable -- it is the only copy of what the user chose.
    """
    STATUS_FILTERS = [
        ('all', 'All'),
        ('errors', 'Errors only'),
        ('unmitigated', 'Unmitigated risks'),
    ]

    DEFAULT_COLUMNS = ['PRD', 'ARCH', 'RISK', 'SRS', 'VERIF', 'VAL']

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trace_preferences')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='trace_preferences')
    # Ordered list of node types; order is the on-screen column order. 2-6 entries.
    columns = models.JSONField(default=list)
    status_filter = models.CharField(max_length=16, choices=STATUS_FILTERS, default='all')
    # List of subsystem names to keep; empty list means "no subsystem filter".
    subsystem_filter = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['user', 'product']]

    def __str__(self):
        return f"{self.user} / {self.product} trace layout"