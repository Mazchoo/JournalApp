import django.db.models.deletion
from django.db import migrations, models


def delete_orphaned_cameras(apps, schema_editor):
    Camera = apps.get_model("main", "Camera")
    Camera.objects.filter(entrymesh__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("main", "0009_entrymesh_orbitcamera"),
    ]

    operations = [
        migrations.RunPython(delete_orphaned_cameras, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="entrymesh",
            name="camera",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                to="main.camera",
            ),
        ),
    ]
