from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("main", "0004_entryvideo"),
    ]

    operations = [
        migrations.RenameField(
            model_name="entryimage",
            old_name="original",
            new_name="allow_ai_synthesis",
        ),
        migrations.RenameField(
            model_name="entryvideo",
            old_name="original",
            new_name="allow_ai_synthesis",
        ),
        migrations.AddField(
            model_name="entryparagraph",
            name="allow_ai_synthesis",
            field=models.BooleanField(default=False),
        ),
    ]
