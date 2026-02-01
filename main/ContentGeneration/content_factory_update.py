"""Update content delegate update date functions"""

from pathlib import Path
from django.forms import model_to_dict

from main.forms import ImageForm, ParagraphForm, VideoForm
from main.models import EntryImage, EntryParagraph, EntryVideo


def get_updated_date_image(image: EntryImage, destination_slug: str) -> ImageForm:
    """Update image content date with a new form"""
    new_image_dict = model_to_dict(image)
    new_image_dict["entry"] = destination_slug
    new_image_dict["file_path"] = Path(new_image_dict["file_path"]).name

    return ImageForm(new_image_dict)


def get_updated_date_video(video: EntryVideo, destination_slug: str) -> VideoForm:
    """Update video content date with a new form"""
    new_video_dict = model_to_dict(video)
    new_video_dict["entry"] = destination_slug
    new_video_dict["file_path"] = Path(new_video_dict["file_path"]).name

    return VideoForm(new_video_dict)


def getUpdatedDateParagraph(
    paragraph: EntryParagraph, destination_slug: str
) -> ParagraphForm:
    """Update paragraph content date with a new form"""
    new_paragraph_dict = model_to_dict(paragraph)
    new_paragraph_dict["entry"] = destination_slug

    return ParagraphForm(new_paragraph_dict)


CONTENT_UPDATE_DATE = {
    "image": get_updated_date_image,
    "paragraph": getUpdatedDateParagraph,
    "video": get_updated_date_video,
}
