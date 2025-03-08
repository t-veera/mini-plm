from django.db import models
from django.contrib.auth.models import User

class File(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    upload_date = models.DateTimeField(auto_now_add=True)
    file_path = models.CharField(max_length=1024)
    # Allow null and provide a default empty dict for metadata
    metadata = models.JSONField(default=dict, null=True, blank=True)

    def __str__(self):
        return self.name
