"""Backfill `category` for files that existed before the field was added.

Classifies each row from its file extension using the same map as
`files.models.category_for_extension`. The map is inlined here on purpose: a data
migration must keep behaving the same way even if the runtime map later changes.

Extension is read from the stored upload path, falling back to the file's display
name (older rows can have an empty uploaded_file but still carry the name).
"""
import os

from django.db import migrations

ELECTRONICS_EXTS = {'kicad_sch', 'kicad_pcb', 'sch', 'brd', 'gbr', 'gerber', 'net'}
MECHANICAL_EXTS = {'step', 'stp', 'stl', 'dxf', 'f3d', 'iges', 'igs',
                   'sldprt', 'sldasm', 'ipt', 'iam', '3mf', 'obj'}


def _category_for_extension(ext):
    if not ext:
        return 'misc'
    ext = ext.lower().lstrip('.')
    if ext in ELECTRONICS_EXTS:
        return 'electronics'
    if ext in MECHANICAL_EXTS:
        return 'mechanical'
    return 'misc'


def backfill_category(apps, schema_editor):
    File = apps.get_model('files', 'File')
    updates = []
    for f in File.objects.all().only('id', 'name', 'uploaded_file', 'category'):
        source = f.uploaded_file.name if f.uploaded_file else (f.name or '')
        ext = os.path.splitext(source)[1].lower().lstrip('.')
        if not ext:
            ext = os.path.splitext(f.name or '')[1].lower().lstrip('.')
        category = _category_for_extension(ext)
        if f.category != category:
            f.category = category
            updates.append(f)
    if updates:
        File.objects.bulk_update(updates, ['category'], batch_size=500)


def noop_reverse(apps, schema_editor):
    """Reversing leaves the values in place; the schema migration drops the column."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('files', '0015_file_category'),
    ]

    operations = [
        migrations.RunPython(backfill_category, noop_reverse),
    ]
