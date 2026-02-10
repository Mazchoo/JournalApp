"""Content type to model"""

from typing import Iterable, Union

from main.models import EntryImage, EntryParagraph, EntryVideo
from main.config import IContentTypes


class ContentFactory:
    """Delegate content type to Model"""

    _CONTENT_MODELS = {
        "image": EntryImage,
        "paragraph": EntryParagraph,
        "video": EntryVideo,
    }

    @staticmethod
    def get(
        content_type: IContentTypes,
    ) -> Union[EntryImage, EntryParagraph, EntryVideo]:
        """Return model for content type"""
        if content_type not in ContentFactory._CONTENT_MODELS:
            raise ValueError(f"Unrecognised content type {content_type}")
        return ContentFactory._CONTENT_MODELS[content_type]

    @staticmethod
    def all_content_models() -> Iterable[Union[EntryImage, EntryParagraph, EntryVideo]]:
        """Return all models that are entry content"""
        yield from ContentFactory._CONTENT_MODELS.values()
