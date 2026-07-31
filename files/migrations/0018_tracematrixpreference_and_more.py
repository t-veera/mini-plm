"""Phase 2: container-agnostic trace index + per-user matrix layout.

Phase-1 rows are all iteration-sourced, so `source_container_key` is derived from the
existing `source_iteration_id`. This has to happen BEFORE the new unique constraint is
added: every row starts at the '' default, which would make two nodes with the same tag
in different iterations look like duplicates and abort the migration.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def backfill_container_key(apps, schema_editor):
    TraceNode = apps.get_model('files', 'TraceNode')
    rows = list(TraceNode.objects.exclude(source_iteration_id=None).only('id', 'source_iteration_id'))
    for row in rows:
        row.source_container_key = f"iteration:{row.source_iteration_id}"
    if rows:
        TraceNode.objects.bulk_update(rows, ['source_container_key'], batch_size=500)


def clear_container_key(apps, schema_editor):
    """Reversing drops the column anyway; blank the values so the reverse is clean."""
    apps.get_model('files', 'TraceNode').objects.update(source_container_key='')


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('files', '0017_tracenode_traceedge'),
    ]

    operations = [
        migrations.CreateModel(
            name='TraceMatrixPreference',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('columns', models.JSONField(default=list)),
                ('status_filter', models.CharField(choices=[('all', 'All'), ('errors', 'Errors only'), ('unmitigated', 'Unmitigated risks')], default='all', max_length=16)),
                ('subsystem_filter', models.JSONField(blank=True, default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.AlterUniqueTogether(
            name='tracenode',
            unique_together=set(),
        ),
        migrations.AddField(
            model_name='tracenode',
            name='source_container_key',
            field=models.CharField(db_index=True, default='', max_length=32),
        ),
        migrations.AddField(
            model_name='tracenode',
            name='source_stage',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='trace_nodes', to='files.stage'),
        ),
        migrations.AlterField(
            model_name='tracenode',
            name='source_iteration',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='trace_nodes', to='files.iteration'),
        ),
        migrations.RunPython(backfill_container_key, clear_container_key),
        migrations.AddConstraint(
            model_name='tracenode',
            constraint=models.UniqueConstraint(fields=('product', 'source_container_key', 'node_type', 'tag_id'), name='uniq_trace_node_per_container'),
        ),
        migrations.AddField(
            model_name='tracematrixpreference',
            name='product',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='trace_preferences', to='files.product'),
        ),
        migrations.AddField(
            model_name='tracematrixpreference',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='trace_preferences', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AlterUniqueTogether(
            name='tracematrixpreference',
            unique_together={('user', 'product')},
        ),
    ]
