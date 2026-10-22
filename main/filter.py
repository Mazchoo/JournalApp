"""Django html helpers"""

from django.template.defaulttags import register


@register.filter
def get_item(dictionary, key):
    """Extract value from dictionary"""
    return dictionary.get(key)
