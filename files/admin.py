from django.contrib import admin
from .models import Product, File, Stage, Iteration, FileRevision

@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ['name', 'file_type', 'file_path', 'created_at', 'owner']
    list_filter = ['file_type', 'created_at', 'status']
    search_fields = ['name', 'file_path']

admin.site.register(Product)
admin.site.register(Stage)
admin.site.register(Iteration)
admin.site.register(FileRevision)