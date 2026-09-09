import django.db.models.deletion
from django.db import migrations, models


def copy_mesh_fk_and_delete_orphans(apps, schema_editor):
    """Point each Camera at its mesh, then drop cameras no mesh referenced.

    Orphans can exist even with a OneToOneField: uniqueness only means each
    mesh points at a distinct camera. Deleting a mesh did not cascade the other
    way, so unreferenced Camera rows accumulated.
    """
    Camera = apps.get_model("main", "Camera")
    EntryMesh = apps.get_model("main", "EntryMesh")

    for mesh in EntryMesh.objects.all():
        Camera.objects.filter(pk=mesh.camera_id).update(mesh_id=mesh.pk)

    Camera.objects.filter(mesh_id__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("main", "0011_entry_year_month_day"),
    ]

    operations = [
        migrations.AddField(
            model_name="camera",
            name="mesh",
            field=models.OneToOneField(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="camera",
                to="main.entrymesh",
            ),
        ),
        migrations.RunPython(
            copy_mesh_fk_and_delete_orphans, migrations.RunPython.noop
        ),
        migrations.AlterField(
            model_name="camera",
            name="mesh",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="camera",
                to="main.entrymesh",
            ),
        ),
        migrations.RemoveField(
            model_name="entrymesh",
            name="camera",
        ),
    ]
