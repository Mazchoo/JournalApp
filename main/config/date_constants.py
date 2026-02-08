"""Configuration for static day and month names"""

from typing import Tuple

IDayNamesOfWeek = Tuple[str, str, str, str, str, str, str]
IMonthNamesOfYear = Tuple[str, str, str, str, str, str, str, str, str, str, str, str]


class DateConstants:
    """Static date information"""

    day_names: IDayNamesOfWeek = (
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    )
    day_names_short: IDayNamesOfWeek = ("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
    month_names: IMonthNamesOfYear = (
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    )
