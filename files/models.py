from django.db import models
from django.contrib.auth.models import User

def upload_to_revision(instance, filename):
    """
    Define where uploaded files should be stored
    """
    return f'uploads/{filename}'

class File(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    upload_date = models.DateTimeField(auto_now_add=True)
    file_path = models.CharField(max_length=1024)
    uploaded_file = models.FileField(blank=True, null=True, upload_to=upload_to_revision)
    metadata = models.JSONField(default=dict, null=True, blank=True)

    def __str__(self):
        return self.name

class FileRevision(models.Model):
    file = models.ForeignKey(File, related_name='revisions', on_delete=models.CASCADE)
    revision_number = models.IntegerField(default=1)
    file_path = models.CharField(max_length=1024)
    upload_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.file.name} (Rev {self.revision_number})"