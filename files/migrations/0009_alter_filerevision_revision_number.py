# Generated by Django 4.2.1 on 2025-06-02 17:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('files', '0008_alter_filerevision_options_alter_stage_options_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='filerevision',
            name='revision_number',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
