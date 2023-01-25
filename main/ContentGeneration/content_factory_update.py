
from pathlib import Path
from django.forms import model_to_dict

import main.forms as forms


def getUpdatedDateImage(image_obj, destination_slug):
    new_image_dict = model_to_dict(image_obj)
    new_image_dict['entry'] = destination_slug
    new_image_dict["file_path"] = Path(new_image_dict["file_path"]).name

    return forms.ImageForm(new_image_dict)


def getUpdatedDateParagraph(paragraph_obj, destination_slug):
    new_paragraph_dict = model_to_dict(paragraph_obj)
    new_paragraph_dict['entry'] = destination_slug

    return forms.ImageForm(new_paragraph_dict)


CONTENT_UPDATE_DATE = {
    "image": getUpdatedDateImage,
    "paragraph": getUpdatedDateParagraph
}
