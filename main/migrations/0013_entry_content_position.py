import django.db.models.deletion
from django.db import migrations, models

_LINK_TABLE = "main_entry_content"
_UNIQUE_INDEX = "unique_entry_content"
_PREVIOUS_UNIQUE_INDEX = "main_entry_content_entry_id_content_id_e1fd0d40_uniq"


def _unique_index_names(schema_editor) -> list[str]:
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT name FROM sqlite_master
            WHERE type = 'index'
              AND tbl_name = %s
              AND sql LIKE 'CREATE UNIQUE INDEX%%'
            """,
            [_LINK_TABLE],
        )
        return [row[0] for row in cursor.fetchall()]


def add_content_position(apps, schema_editor):
    """Add display order to the existing entry-content links."""
    quote = schema_editor.connection.ops.quote_name
    schema_editor.execute(
        f"ALTER TABLE {quote(_LINK_TABLE)} ADD COLUMN {quote('position')} "
        'integer unsigned NOT NULL DEFAULT 0 CHECK ("position" >= 0)'
    )
    schema_editor.execute(
        f"""
        UPDATE {quote(_LINK_TABLE)}
        SET {quote("position")} = (
            SELECT COUNT(*)
            FROM {quote(_LINK_TABLE)} AS earlier
            WHERE earlier.entry_id = {quote(_LINK_TABLE)}.entry_id
              AND earlier.id < {quote(_LINK_TABLE)}.id
        )
        """
    )
    for index_name in _unique_index_names(schema_editor):
        schema_editor.execute(f"DROP INDEX {quote(index_name)}")
    schema_editor.execute(
        f"CREATE UNIQUE INDEX {quote(_UNIQUE_INDEX)} "
        f"ON {quote(_LINK_TABLE)} ({quote('entry_id')}, {quote('content_id')})"
    )


def remove_content_position(apps, schema_editor):
    """Reverse of add_content_position."""
    quote = schema_editor.connection.ops.quote_name
    for index_name in _unique_index_names(schema_editor):
        schema_editor.execute(f"DROP INDEX {quote(index_name)}")
    schema_editor.execute(
        f"CREATE UNIQUE INDEX {quote(_PREVIOUS_UNIQUE_INDEX)} "
        f"ON {quote(_LINK_TABLE)} ({quote('entry_id')}, {quote('content_id')})"
    )
    schema_editor.execute(
        f"ALTER TABLE {quote(_LINK_TABLE)} DROP COLUMN {quote('position')}"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("main", "0012_camera_mesh_onetoone"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(add_content_position, remove_content_position),
            ],
            state_operations=[
                migrations.CreateModel(
                    name="EntryContent",
                    fields=[
                        (
                            "id",
                            models.BigAutoField(
                                auto_created=True,
                                primary_key=True,
                                serialize=False,
                                verbose_name="ID",
                            ),
                        ),
                        ("position", models.PositiveIntegerField(default=0)),
                        (
                            "content",
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.CASCADE,
                                to="main.content",
                            ),
                        ),
                        (
                            "entry",
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.CASCADE,
                                to="main.entry",
                            ),
                        ),
                    ],
                    options={
                        "db_table": "main_entry_content",
                        "ordering": ["position", "id"],
                    },
                ),
                migrations.AlterField(
                    model_name="entry",
                    name="content",
                    field=models.ManyToManyField(
                        through="main.EntryContent", to="main.content"
                    ),
                ),
                migrations.AddConstraint(
                    model_name="entrycontent",
                    constraint=models.UniqueConstraint(
                        fields=("entry", "content"), name="unique_entry_content"
                    ),
                ),
            ],
        ),
    ]
