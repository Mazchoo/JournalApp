"""Request information from single entries"""

from main.database_layer.fe_interfaces import EntryContentContext
from main.models import Entry

from main.content_generation.content_factory_models import CONTENT_MODELS


def load_all_content_from_entry(date_slug: str) -> EntryContentContext:
    """For content with a given date slug return content information about the entry."""
    entry_query = Entry.objects.all().filter(name=date_slug)
    output: dict[str, str] = {}

    entry_exists = entry_query.exists()
    if entry_exists:
        entry = entry_query[0]
        content_ids = entry.content.get_queryset()

        for content in content_ids:
            Model = CONTENT_MODELS[
                content.content_type
            ]  # ToDo - Make an abstract class for this type
            content_obj = Model.objects.get(pk=content.content_id)
            output[str(content)] = content_obj.view()  # type: ignore

    return {"entry_exists": entry_exists, "saved_content": output}
