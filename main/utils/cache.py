"""Objects that help with cache"""

from functools import wraps
from typing import Dict, Tuple

from Journal.settings import MAX_IMAGE_CACHE_SIZE


def cache_string(func):
    """Function wrapper that will check key is in cache, blank values not accepted"""
    cache: Dict[Tuple[str], str] = {}

    @wraps(func)
    def wrapper(*args):
        if args in cache:
            return cache[args]

        result = func(*args)

        if result != "" and len(cache) < MAX_IMAGE_CACHE_SIZE:
            cache[args] = result

        return result

    return wrapper
