from django.db import migrations, models


def set_all_true(apps, schema_editor):
    EntryImage = apps.get_model("main", "EntryImage")
    EntryVideo = apps.get_model("main", "EntryVideo")
    EntryParagraph = apps.get_model("main", "EntryParagraph")
    EntryImage.objects.all().update(allow_ai_synthesis=True)
    EntryVideo.objects.all().update(allow_ai_synthesis=True)
    EntryParagraph.objects.all().update(allow_ai_synthesis=True)


class Migration(migrations.Migration):
    dependencies = [
        ("main", "0005_rename_original_allow_ai_synthesis"),
    ]

    operations = [
        migrations.AlterField(
            model_name="entryparagraph",
            name="allow_ai_synthesis",
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(set_all_true, migrations.RunPython.noop),
    ]
