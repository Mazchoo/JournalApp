"""Django html helpers"""

from django.template.defaulttags import register


@register.filter
def get_item(dictionary, key):
    """Extract value from dictionary"""
    return dictionary.get(key)


@register.filter
def eq(obj, key) -> bool:
    """Return true if objects equal"""
    return obj == key
