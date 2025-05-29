from django.db import models
from django.contrib.auth.models import User

def upload_to_revision(instance, filename):
    if hasattr(instance, 'revision_number'):
        return f'uploads/{filename}_rev{instance.revision_number}'
    return f'uploads/{filename}'

class Product(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    def __str__(self):
        return self.name

class Stage(models.Model):
    product = models.ForeignKey(Product, related_name='stages', on_delete=models.CASCADE)
    label = models.CharField(max_length=50)
    type = models.CharField(max_length=1)  # 'S' or 'I'
    color = models.CharField(max_length=20)
    order = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.label} ({self.type})"

class File(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    upload_date = models.DateTimeField(auto_now_add=True)
    file_path = models.CharField(max_length=1024, blank=True, null=True)
    uploaded_file = models.FileField(upload_to=upload_to_revision, null=True, blank=True)
    metadata = models.JSONField(default=dict, null=True, blank=True)
    stage = models.ForeignKey(Stage, related_name='files', on_delete=models.CASCADE, null=True, blank=True)

    def __str__(self):
        return self.name

class FileRevision(models.Model):
    file = models.ForeignKey(File, related_name='revisions', on_delete=models.CASCADE)
    revision_number = models.IntegerField(default=1)
    file_path = models.CharField(max_length=1024, blank=True, null=True)
    uploaded_file = models.FileField(upload_to=upload_to_revision, null=True, blank=True)
    upload_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file.name} (Rev {self.revision_number})"
