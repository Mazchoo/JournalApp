"""Content type to model"""

from typing import Iterable

from django.db.models import Model

from main.models import EntryImage, EntryMesh, EntryParagraph, EntryVideo
from main.config import IContentTypes


class ContentFactory:
    """Delegate content type to Model"""

    _CONTENT_MODELS: dict[str, type[Model]] = {
        "image": EntryImage,
        "paragraph": EntryParagraph,
        "video": EntryVideo,
        "mesh": EntryMesh,
    }

    @staticmethod
    def get(content_type: IContentTypes) -> type[Model]:
        """Return model for content type"""
        if content_type not in ContentFactory._CONTENT_MODELS:
            raise ValueError(f"Unrecognised content type {content_type}")
        return ContentFactory._CONTENT_MODELS[content_type]

    @staticmethod
    def all_content_models() -> Iterable[type[Model]]:
        """Return all models that are entry content"""
        yield from ContentFactory._CONTENT_MODELS.values()
