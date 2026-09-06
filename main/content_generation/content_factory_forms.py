"""Delegate content type to model form"""

from typing import Iterable, Union

from main.forms import ImageForm, MeshForm, ParagraphForm, VideoForm
from main.config import IContentTypes


class ContentFormFactory:
    """Delegate content type to Model"""

    _CONTENT_FORMS = {
        "image": ImageForm,
        "paragraph": ParagraphForm,
        "video": VideoForm,
        "mesh": MeshForm,
    }

    @staticmethod
    def get(
        content_type: IContentTypes,
    ) -> Union[ImageForm, ParagraphForm, VideoForm, MeshForm]:
        """Return model form for content type"""
        if content_type not in ContentFormFactory._CONTENT_FORMS:
            raise ValueError(f"Unrecognised content type {content_type}")
        return ContentFormFactory._CONTENT_FORMS[content_type]

    @staticmethod
    def all_content_models() -> Iterable[
        Union[ImageForm, ParagraphForm, VideoForm, MeshForm]
    ]:
        """Return all models that are entry content"""
        yield from ContentFormFactory._CONTENT_FORMS.values()
