"""Delegate content type to model form"""

from main.forms import ImageForm, ParagraphForm, VideoForm

CONTENT_FORMS = {"image": ImageForm, "paragraph": ParagraphForm, "video": VideoForm}
