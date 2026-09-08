"""Data validation to create or edit models"""

from binascii import Error as BinasciiError
from pathlib import Path
from typing import Self

from django import forms
from django.forms import ModelForm
from django.db import models as django_models
from tinymce.widgets import TinyMCE  # type: ignore

from main.models import (
    Camera,
    Content,
    Entry,
    EntryImage,
    EntryMesh,
    EntryParagraph,
    EntryVideo,
)
from main.utils.image import (
    move_image_to_save_path,
    lazy_create_image_icon,
    lazy_create_base64_image_data,
)
from main.utils.video import lazy_create_video_icon, lazy_create_resized_collage
from main.utils.file_io import (
    path_has_image_reserved_tag,
    get_stored_media_path,
    get_base_entry_path,
    make_media_path_relative,
    move_media_to_save_path,
    get_resized_filename,
)
from main.utils.mesh import save_mesh_frame_image
from main.utils.parsing import coerce_string_int_to_bool
from main.utils.errors import form_errors_message
from main.config import (
    ALLOWED_CONTENT_TYPES,
    ImageConstants,
    MeshConstants,
    VideoConstants,
)
from main.database_layer.date_slugs import get_valid_date_from_slug


class EntryForm(ModelForm):
    """A dated journal entry - at most one entry per date"""

    class Meta:
        model = Entry
        fields = ["name", "first_created", "last_edited", "date"]

    def clean_date(self):
        """Convert slug string into date object"""
        clean_data = super().clean()
        if clean_data is None:
            raise forms.ValidationError("Date is not defined")

        name = clean_data["name"]
        entry_date = get_valid_date_from_slug(name)

        if entry_date is None:
            raise forms.ValidationError(f"Entry must have a real date {name}")

        return entry_date


class ImageForm(ModelForm):
    """Image content that belongs to an entry form"""

    class Meta:
        model = EntryImage
        fields = "__all__"

    def clean_file_path(self):
        """Ensure file path refers to usuable file"""
        clean_data = super().clean()
        if clean_data is None:
            raise forms.ValidationError("No data provided for image form")

        file_name = clean_data["file_path"]
        entry = clean_data["entry"]

        if len(file_name) == 0:
            raise forms.ValidationError("Path is empty")

        if "." not in file_name:
            raise forms.ValidationError(f"Path '{file_name}' has no extension")

        target_path = get_stored_media_path(file_name, entry.name)
        target_file_obj = Path(target_path)

        source_path = get_base_entry_path(file_name)
        source_file_obj = Path(source_path)

        if not target_file_obj.exists() and not source_file_obj.exists():
            raise forms.ValidationError(f"Cannot find '{file_name}' in Entries folder.")

        if target_file_obj.suffix.lower() not in ImageConstants.supported_extensions:
            message = f"Extension '{target_file_obj.suffix}' is not a recognised image extension"
            raise forms.ValidationError(message)

        if path_has_image_reserved_tag(target_file_obj):
            message = f"File '{target_file_obj.stem}' uses reserved tag in {ImageConstants.reserved_image_tags}"
            raise forms.ValidationError(message)

        move_image_to_save_path(target_path, file_name)
        lazy_create_base64_image_data(Path(target_path))
        lazy_create_image_icon(Path(target_path))
        return make_media_path_relative(target_path)

    def clean_allow_ai_synthesis(self):
        """Ensure file path refers to usuable file"""
        allow_syn = self.data.get("allow_ai_synthesis")
        if allow_syn is None:
            raise forms.ValidationError("Generate information not provided")

        cleaned_bool = coerce_string_int_to_bool(allow_syn)
        if cleaned_bool is not None:
            return cleaned_bool

        raise forms.ValidationError(
            "Allow AI Synthesis is not coercible to a boolean in 0, 1 format"
        )


class VideoForm(ModelForm):
    """Form to create a video content for entry"""

    class Meta:
        model = EntryVideo
        fields = "__all__"

    def clean_file_path(self):
        """Ensure file path refers to usuable file"""
        clean_data = super().clean()
        if clean_data is None:
            raise forms.ValidationError("File path is not defined")

        file_name = clean_data["file_path"]
        entry = clean_data["entry"]

        if len(file_name) == 0:
            raise forms.ValidationError("Path is empty")

        if "." not in file_name:
            raise forms.ValidationError(f"Path '{file_name}' has no extension")

        target_path = get_stored_media_path(file_name, entry.name)
        target_file_obj = Path(target_path)

        source_path = get_base_entry_path(file_name)
        source_file_obj = Path(source_path)

        if not target_file_obj.exists() and not source_file_obj.exists():
            raise forms.ValidationError(f"Cannot find folder '{source_path}'")

        if target_file_obj.suffix.lower() not in VideoConstants.supported_extensions:
            message = f"Extension '{target_file_obj.suffix}' is not a recognised image extension"
            raise forms.ValidationError(message)

        move_media_to_save_path(target_path, file_name)
        video_path = Path(target_path)
        lazy_create_video_icon(video_path)
        lazy_create_resized_collage(video_path)

        return make_media_path_relative(target_path)

    def clean_allow_ai_synthesis(self):
        """Ensure file path refers to usuable file"""
        allow_syn = self.data.get("allow_ai_synthesis")
        if allow_syn is None:
            raise forms.ValidationError("Generate information not provided")

        cleaned_bool = coerce_string_int_to_bool(allow_syn)
        if cleaned_bool is not None:
            return cleaned_bool

        raise forms.ValidationError(
            "Allow AI Synthesis is not coercible to a boolean in 0, 1 format"
        )


class CameraForm(ModelForm):
    """Orbit camera stored with a mesh."""

    class Meta:
        model = Camera
        fields = "__all__"

    @staticmethod
    def _orbit_vector_component(vector, ind: int) -> float:
        """Read one axis from an orbit-camera vector sent as a list or numbered dict."""
        if vector is None:
            raise forms.ValidationError("Camera vector is missing")

        if isinstance(vector, dict):
            raw = vector.get(str(ind), vector.get(ind))
        else:
            try:
                raw = vector[ind]
            except (IndexError, TypeError, KeyError) as exc:
                raise forms.ValidationError("Camera vector is invalid") from exc

        if raw is None:
            raise forms.ValidationError("Camera vector is incomplete")

        try:
            return float(raw)
        except (TypeError, ValueError) as exc:
            raise forms.ValidationError("Camera vector is not numeric") from exc

    @classmethod
    def orbit_camera_to_model_fields(cls, camera_data: dict) -> Self:
        """Construct a CameraForm from frontend OrbitCamera fields."""
        return cls(
            {
                "right_x": cls._orbit_vector_component(camera_data.get("right"), 0),
                "right_y": cls._orbit_vector_component(camera_data.get("right"), 1),
                "right_z": cls._orbit_vector_component(camera_data.get("right"), 2),
                "up_x": cls._orbit_vector_component(camera_data.get("up"), 0),
                "up_y": cls._orbit_vector_component(camera_data.get("up"), 1),
                "up_z": cls._orbit_vector_component(camera_data.get("up"), 2),
                "forward_x": cls._orbit_vector_component(camera_data.get("forward"), 0),
                "forward_y": cls._orbit_vector_component(camera_data.get("forward"), 1),
                "forward_z": cls._orbit_vector_component(camera_data.get("forward"), 2),
                "radius": float(camera_data["radius"]),
                "pan_x": float(camera_data.get("panX", camera_data.get("pan_x"))),
                "pan_y": float(camera_data.get("panY", camera_data.get("pan_y"))),
            }
        )


class MeshForm(ModelForm):
    """Form to create a mesh content for entry"""

    camera = forms.Field()  # needs to be intialized as camera object
    image_path = forms.CharField(required=False, max_length=256)  # lazily updated

    class Meta:
        model = EntryMesh
        fields = "__all__"

    def clean_file_path(self):
        """Ensure file path refers to a usable glb and move it into the date folder."""
        clean_data = super().clean()
        if clean_data is None:
            raise forms.ValidationError("File path is not defined")

        file_name = clean_data["file_path"]
        entry = clean_data["entry"]

        if len(file_name) == 0:
            raise forms.ValidationError("Path is empty")

        if "." not in file_name:
            raise forms.ValidationError(f"Path '{file_name}' has no extension")

        target_path = get_stored_media_path(file_name, entry.name)
        target_file_obj = Path(target_path)

        if target_file_obj.suffix.lower() not in MeshConstants.supported_extensions:
            message = f"Extension '{target_file_obj.suffix}' is not a recognised mesh extension"
            raise forms.ValidationError(message)

        source_path = get_base_entry_path(file_name)
        source_file_obj = Path(source_path)

        if not target_file_obj.exists() and not source_file_obj.exists():
            raise forms.ValidationError(f"Cannot find folder '{source_path}'")

        move_media_to_save_path(target_path, file_name)
        return make_media_path_relative(target_path)

    def clean_camera(self):
        """Turn the orbit-camera dict into a Camera."""
        camera_data = self.cleaned_data["camera"]
        if not isinstance(camera_data, dict):
            raise forms.ValidationError("Camera data is not a dict")

        try:
            camera_form = CameraForm.orbit_camera_to_model_fields(camera_data)
        except (TypeError, ValueError, KeyError) as exc:
            raise forms.ValidationError("Camera is invalid") from exc

        if not camera_form.is_valid():
            raise forms.ValidationError(
                f"Invalid camera {form_errors_message(camera_form.errors)}"
            )

        return camera_form.save(commit=False)

    def clean_image_path(self):
        """Write a new preview from a data-URL, or keep the stored one."""
        frame_image = self.data.get("frame_image") or ""
        file_path = self.cleaned_data.get("file_path")
        if not file_path:
            return self.cleaned_data.get("image_path") or ""

        full_mesh_path = Path(get_base_entry_path(file_path))
        if frame_image:
            try:
                return save_mesh_frame_image(full_mesh_path, frame_image)
            except (ValueError, OSError, BinasciiError) as exc:
                raise forms.ValidationError("Frame image is not a valid image") from exc

        preview_path = get_resized_filename(full_mesh_path)
        if preview_path.exists():
            lazy_create_image_icon(preview_path)
            return make_media_path_relative(str(preview_path))

        raise forms.ValidationError("Frame image is not defined")

    def _get_validation_exclusions(self):
        """Skip FK checks on the unsaved camera until save() persists it."""
        exclude = super()._get_validation_exclusions()
        exclude.add("camera")
        return exclude

    def save(self, commit=True):
        """Persist the camera first, then the mesh that points at it."""
        camera = self.cleaned_data["camera"]
        camera.save()
        self.instance.camera = camera
        return super().save(commit)


class ParagraphForm(ModelForm):
    """Text content in journal entry"""

    text = forms.CharField(
        widget=TinyMCE(attrs={"cols": 80, "rows": 30, "required": False})
    )
    entry = django_models.ForeignKey(Entry, on_delete=django_models.CASCADE)

    class Meta:
        model = EntryParagraph
        fields = "__all__"

    def clean_allow_ai_synthesis(self):
        """Ensure file path refers to usuable file"""
        allow_syn = self.data.get("allow_ai_synthesis")
        if allow_syn is None:
            raise forms.ValidationError("Generate information not provided")

        cleaned_bool = coerce_string_int_to_bool(allow_syn)
        if cleaned_bool is not None:
            return cleaned_bool

        raise forms.ValidationError(
            "Allow AI Synthesis is not coercible to a boolean in 0, 1 format"
        )

    def clean_raw_html(self):
        """Treat a missing flag as a TinyMCE paragraph."""
        raw_html = self.data.get("raw_html")
        if raw_html is None:
            return False

        cleaned_bool = coerce_string_int_to_bool(raw_html)
        if cleaned_bool is not None:
            return cleaned_bool

        raise forms.ValidationError(
            "Raw HTML is not coercible to a boolean in 0, 1 format"
        )


class DeleteEntryForm(forms.Form):
    """Validate request to delete a journal entry"""

    entry = forms.SlugField(max_length=10)

    def clean_entry(self):
        """Ensure entry exists and return the entry object"""
        entry_name = self.cleaned_data["entry"]
        entry = Entry.objects.filter(name=entry_name).first()

        if entry is None:
            raise forms.ValidationError(f"Invalid entry {entry_name}")

        return entry


class ContentForm(ModelForm):
    """Generic content that applies to all content types e.g. image, text, ect."""

    class Meta:
        model = Content
        fields = "__all__"

    def clean(self):
        """Ensure content type can refer to model"""
        clean_data = super().clean()
        if clean_data is None:
            raise forms.ValidationError("No data provided")

        content_type = clean_data["content_type"]
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise forms.ValidationError(f"Content type {content_type} not recognised")
