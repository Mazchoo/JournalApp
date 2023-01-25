
from collections import OrderedDict
from typing import Any, List
from django.http.request import QueryDict
from django.http import Http404


def isAjax(request):
    if not hasattr(request, 'META'):
        return False
    return request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest'


def getTableOfKeys(key):
    return [k[:-1] if k[-1] == ']' else k for k in key.split('[')]


def addNestedKeyToDict(nested_keys: List[str], value: Any, output_dict: OrderedDict):
    current_dict = output_dict
    for nested_key in nested_keys[:-1]:
        if nested_key in current_dict:
            current_dict = current_dict[nested_key]
        else:
            current_dict[nested_key] = OrderedDict()
            current_dict = current_dict[nested_key]

    current_dict[nested_keys[-1]] = value
    return output_dict


def convertQueryDictToNestedDict(query_dict: QueryDict):
    output_dict = OrderedDict()

    for key, value in query_dict.items():
        nested_keys = getTableOfKeys(key)
        output_dict = addNestedKeyToDict(nested_keys, value, output_dict)

    return output_dict


def ajaxRequest(func):
    ''' Check that input request is an ajax request. '''
    def wrapFunc(request):
        if not isAjax(request) or not request.POST:
            raise Http404
        post_data = convertQueryDictToNestedDict(request.POST)

        return func(post_data)
    return wrapFunc
