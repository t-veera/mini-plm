from django.db import models
from django.contrib.auth.models import User
import os

def upload_to_revision(instance, filename):
    """
    Custom upload path for FileRevision uploaded files.
    Files are saved to: uploads/<file_id>/revision_<revision_number>/<filename>
    """
    file_id = instance.file.id if instance.file else 'unknown_file'
    revision_num = instance.revision_number or 'unknown_revision'
    base_filename = os.path.basename(filename)
    return f"uploads/{file_id}/revision_{revision_num}/{base_filename}"

class Product(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.name

class Stage(models.Model):
    STAGE_TYPES = [
        ('workflow', 'Workflow'),
        ('approval', 'Approval'),
        ('review', 'Review'),
    ]
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stages')
    label = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=STAGE_TYPES, default='workflow')
    color = models.CharField(max_length=7, default='#007bff')  # Hex color
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.product.name} - {self.label}"

class File(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    upload_date = models.DateTimeField(auto_now_add=True)
    file_path = models.CharField(max_length=500, blank=True)
    uploaded_file = models.FileField(upload_to='uploads/', blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    stage = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name='files', null=True, blank=True)
    
    # Parent-child relationship fields
    parent_file = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='child_files')
    parent_revision = models.IntegerField(null=True, blank=True)  # Which revision of parent this child belongs to
    is_child_file = models.BooleanField(default=False)
    
    # File properties
    status = models.CharField(max_length=50, default='In-Work')
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    current_revision = models.IntegerField(default=1)

    def __str__(self):
        return self.name

    @property
    def latest_revision(self):
        return self.revisions.order_by('-revision_number').first()

class FileRevision(models.Model):
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name='revisions')
    revision_number = models.IntegerField(blank=True, null=True)
    uploaded_file = models.FileField(upload_to=upload_to_revision)
    file_path = models.CharField(max_length=500, blank=True)
    upload_date = models.DateTimeField(auto_now_add=True)
    change_description = models.TextField(blank=True)
    
    # Revision-specific properties
    status = models.CharField(max_length=50, default='In-Work')
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        unique_together = ['file', 'revision_number']
        ordering = ['-revision_number']

    def __str__(self):
        return f"{self.file.name} - Rev {self.revision_number or '?'}"

    def save(self, *args, **kwargs):
        if self.revision_number is None:
            last_revision = FileRevision.objects.filter(file=self.file).order_by('-revision_number').first()
            self.revision_number = last_revision.revision_number + 1 if last_revision else 1
        if self.uploaded_file and not self.file_path:
            self.file_path = self.uploaded_file.name
        super().save(*args, **kwargs)
