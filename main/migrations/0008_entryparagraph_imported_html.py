from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("main", "0007_alter_entryparagraph_allow_ai_synthesis"),
    ]

    operations = [
        migrations.AddField(
            model_name="entryparagraph",
            name="raw_html",
            field=models.BooleanField(default=False),
        ),
    ]
