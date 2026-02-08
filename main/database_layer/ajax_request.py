"""Extract ajax request fields into a dict when making an async request from js side"""

from collections import OrderedDict
from typing import Any, List

from django.http.request import QueryDict
from django.http import Http404, HttpRequest


def is_ajax(request: HttpRequest) -> bool:
    """Return true is ajax made the request"""
    if not hasattr(request, "META"):
        return False
    return request.META.get("HTTP_X_REQUESTED_WITH") == "XMLHttpRequest"


def extract_nested_key(key: str) -> List[str]:
    """Turn the ajax key into list of named keys"""
    return [k[:-1] if k[-1] == "]" else k for k in key.split("[")]


def add_nested_value_to_dict(
    nested_keys: List[str], value: Any, output_dict: OrderedDict
) -> OrderedDict:
    """Use nested keys to extract nested dict"""
    current_dict = output_dict
    for nested_key in nested_keys[:-1]:
        if nested_key in current_dict:
            current_dict = current_dict[nested_key]
        else:
            current_dict[nested_key] = OrderedDict()
            current_dict = current_dict[nested_key]

    current_dict[nested_keys[-1]] = value
    return output_dict


def convert_query_into_nested_dict(query_dict: QueryDict) -> OrderedDict:
    """Convert query with flat keys into nested keys in a dict"""
    output_dict = OrderedDict()  # type: OrderedDict

    for key, value in query_dict.items():
        nested_keys = extract_nested_key(key)
        output_dict = add_nested_value_to_dict(nested_keys, value, output_dict)

    return output_dict


def ajax_request(func):
    """Check that input request is an ajax request."""

    def wrap_func(request):
        if not is_ajax(request) or not request.POST:
            raise Http404
        post_data = convert_query_into_nested_dict(request.POST)

        return func(post_data)

    return wrap_func
