from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("main", "0013_entry_content_position"),
    ]

    operations = [
        migrations.RenameField(
            model_name="entryparagraph",
            old_name="raw_html",
            new_name="is_raw_html",
        ),
    ]
