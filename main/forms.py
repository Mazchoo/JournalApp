"""Data validation to create or edit models"""

from binascii import Error as BinasciiError
from pathlib import Path

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
from main.utils.image import move_image_to_save_path, create_image_icon
from main.utils.file_io import (
    path_has_image_reserved_tag,
    get_stored_media_path,
    get_base_entry_path,
    make_media_path_relative,
    move_media_to_save_path,
    get_icon_file_path,
    get_resized_filename,
)
from main.utils.mesh import save_mesh_frame_image
from main.utils.parsing import coerce_string_int_to_bool
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
        icon_path = get_icon_file_path(target_file_obj)
        if not icon_path.exists():
            create_image_icon(target_file_obj)

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
    def orbit_camera_to_model_fields(cls, camera_data: dict):
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

    frame_image = forms.CharField(required=False)

    class Meta:
        model = EntryMesh
        fields = ["entry", "file_path"]

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

        source_path = get_base_entry_path(file_name)
        source_file_obj = Path(source_path)

        if not target_file_obj.exists() and not source_file_obj.exists():
            raise forms.ValidationError(f"Cannot find folder '{source_path}'")

        if target_file_obj.suffix.lower() not in MeshConstants.supported_extensions:
            message = f"Extension '{target_file_obj.suffix}' is not a recognised mesh extension"
            raise forms.ValidationError(message)

        move_media_to_save_path(target_path, file_name)
        return make_media_path_relative(target_path)

    def clean_frame_image(self):
        """Accept a data-URL or raw base64 JPEG when provided."""
        frame_image = self.data.get("frame_image")
        if frame_image is None:
            return ""

        if not isinstance(frame_image, str) or not frame_image:
            raise forms.ValidationError("Frame image is not defined")

        return frame_image

    def _resolve_camera(self) -> Camera:
        """Create or load the orbit camera from the nested save payload or a pk."""
        camera_data = self.data.get("camera")
        if camera_data is None:
            raise forms.ValidationError("Camera is not defined")

        if isinstance(camera_data, Camera):
            return camera_data

        if isinstance(camera_data, (int, str)) and str(camera_data).isdigit():
            try:
                return Camera.objects.get(pk=int(camera_data))
            except Camera.DoesNotExist as exc:
                raise forms.ValidationError("Camera not found") from exc

        if not isinstance(camera_data, dict):
            raise forms.ValidationError("Camera data is not a dict")

        try:
            camera_form = CameraForm.orbit_camera_to_model_fields(camera_data)
        except (TypeError, ValueError, KeyError) as exc:
            raise forms.ValidationError("Camera is invalid") from exc

        if not camera_form.is_valid():
            raise forms.ValidationError(f"Invalid camera {camera_form.errors}")

        return camera_form.save(commit=False)

    def _resolve_image_path(self, cleaned_data: dict) -> str:
        """Write a new preview when the request includes one; otherwise keep the stored image."""
        frame_image = cleaned_data.get("frame_image")
        if frame_image:
            full_mesh_path = get_base_entry_path(cleaned_data["file_path"])
            try:
                return save_mesh_frame_image(Path(full_mesh_path), frame_image)
            except (ValueError, OSError, BinasciiError) as exc:
                raise forms.ValidationError("Frame image is not a valid image") from exc

        mesh_path = Path(get_base_entry_path(cleaned_data["file_path"]))
        preview_path = get_resized_filename(mesh_path)
        if preview_path.exists():
            if not get_icon_file_path(mesh_path).exists():
                create_image_icon(mesh_path)
            return make_media_path_relative(str(preview_path))

        image_name = self.data.get("image_path")
        if not image_name:
            raise forms.ValidationError("Frame image is not defined")

        image_name = Path(str(image_name)).name
        entry = cleaned_data["entry"]
        target_path = get_stored_media_path(image_name, entry.name)
        source_path = get_base_entry_path(image_name)

        if not Path(target_path).exists() and not Path(source_path).exists():
            raise forms.ValidationError(
                f"Cannot find '{image_name}' in Entries folder."
            )

        move_media_to_save_path(target_path, image_name)
        if not get_icon_file_path(mesh_path).exists():
            create_image_icon(mesh_path)

        return make_media_path_relative(target_path)

    def clean(self):
        """Attach camera and preview image after the glb has been moved."""
        cleaned_data = super().clean()
        if cleaned_data is None:
            return {}
        if self.errors:
            return cleaned_data

        cleaned_data["camera"] = self._resolve_camera()
        cleaned_data["image_path"] = self._resolve_image_path(cleaned_data)
        return cleaned_data

    def save(self, commit=True):
        """Persist the camera first, then the mesh that points at it."""
        instance = super().save(commit=False)
        camera = self.cleaned_data["camera"]
        if camera.pk is None:
            camera.save()
        instance.camera = camera
        instance.image_path = self.cleaned_data["image_path"]
        if commit:
            instance.save()
        return instance


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
