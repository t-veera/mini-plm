from django.db import migrations


def backfill_folder_container(apps, schema_editor):
    """Give each existing (product-scoped) folder a container.

    Folders used to be product-wide; a folder now belongs to one stage/iteration. For
    every folder that holds files, adopt the container of its files. When a folder's files
    span multiple containers (possible under the old behavior), the most common container
    wins so the bulk of its files stay visible. Empty folders are left uncontained (they
    were empty anyway) and simply won't appear until placed in a container.
    """
    Folder = apps.get_model('files', 'Folder')
    File = apps.get_model('files', 'File')

    for folder in Folder.objects.filter(content_type__isnull=True):
        counts = {}
        for ct_id, obj_id in File.objects.filter(folder_id=folder.id).values_list('content_type_id', 'object_id'):
            if ct_id is None or obj_id is None:
                continue
            counts[(ct_id, obj_id)] = counts.get((ct_id, obj_id), 0) + 1
        if not counts:
            continue
        (ct_id, obj_id), _ = max(counts.items(), key=lambda kv: kv[1])
        folder.content_type_id = ct_id
        folder.object_id = obj_id
        folder.save(update_fields=['content_type', 'object_id'])


def noop_reverse(apps, schema_editor):
    """Reversing just drops the fields (handled by 0013); nothing to undo here."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('files', '0013_folder_content_type_folder_object_id'),
    ]

    operations = [
        migrations.RunPython(backfill_folder_container, noop_reverse),
    ]
