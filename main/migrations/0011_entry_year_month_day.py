from django.db import migrations, models


def backfill_year_month_day(apps, schema_editor):
    Entry = apps.get_model("main", "Entry")
    for entry in Entry.objects.all():
        entry.year = entry.date.year
        entry.month = entry.date.month
        entry.day = entry.date.day
        entry.save(update_fields=["year", "month", "day"])


class Migration(migrations.Migration):
    dependencies = [
        ("main", "0010_entrymesh_camera_onetoone"),
    ]

    operations = [
        migrations.AddField(
            model_name="entry",
            name="year",
            field=models.PositiveSmallIntegerField(null=True),
        ),
        migrations.AddField(
            model_name="entry",
            name="month",
            field=models.PositiveSmallIntegerField(null=True),
        ),
        migrations.AddField(
            model_name="entry",
            name="day",
            field=models.PositiveSmallIntegerField(null=True),
        ),
        migrations.RunPython(backfill_year_month_day, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="entry",
            name="year",
            field=models.PositiveSmallIntegerField(),
        ),
        migrations.AlterField(
            model_name="entry",
            name="month",
            field=models.PositiveSmallIntegerField(),
        ),
        migrations.AlterField(
            model_name="entry",
            name="day",
            field=models.PositiveSmallIntegerField(),
        ),
        migrations.RemoveField(
            model_name="entry",
            name="date",
        ),
        migrations.AddIndex(
            model_name="entry",
            index=models.Index(fields=["year", "month"], name="entry_year_month_idx"),
        ),
        migrations.AddIndex(
            model_name="entry",
            index=models.Index(fields=["year"], name="entry_year_idx"),
        ),
    ]
