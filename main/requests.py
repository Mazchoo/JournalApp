"""Formal defintions of datacases for requests"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from main.config.date_constants import DateConstants
from main.database_layer.date_slugs import date_exists
from main.config.date_constants import IDayNamesOfWeek, IMonthNamesOfYear


@dataclass
class YearPageRequest:
    """Validated year parameter from URL."""

    year: int

    def __post_init__(self):
        if not isinstance(self.year, int):
            raise ValueError("year must be an integer")
        if self.year < 1:
            raise ValueError("year must be positive")
        if not date_exists(self.year):
            raise ValueError(f"Year {self.year} not found")

    @classmethod
    def create(cls, year: int) -> Optional[YearPageRequest]:
        """Create instance, returns None if validation fails."""
        try:
            return cls(year=year)
        except (ValueError, TypeError):
            return None


@dataclass
class MonthPageRequest:
    """Validated year and month parameters from URL."""

    year: int
    month: str

    def __post_init__(self):
        if not isinstance(self.year, int):
            raise ValueError("year must be an integer")
        if self.year < 1:
            raise ValueError("year must be positive")
        if not self.month:
            raise ValueError("month cannot be empty")
        if self.month not in DateConstants.month_names:
            raise ValueError(f"month must be one of {DateConstants.month_names}")
        if not date_exists(self.year, self.month):
            raise ValueError(f"{self.month} {self.year} not found")

    @classmethod
    def create(cls, year: int, month: str) -> Optional[MonthPageRequest]:
        """Create instance, returns None if validation fails."""
        try:
            return cls(year=year, month=month)
        except (ValueError, TypeError):
            return None


@dataclass
class DayPageRequest:
    """Validated year, month, and day parameters from URL."""

    year: int
    month: str
    day: int

    def __post_init__(self):
        if not isinstance(self.year, int):
            raise ValueError("year must be an integer")
        if self.year < 1:
            raise ValueError("year must be positive")
        if not self.month:
            raise ValueError("month cannot be empty")
        if self.month not in DateConstants.month_names:
            raise ValueError(f"month must be one of {DateConstants.month_names}")
        if not isinstance(self.day, int):
            raise ValueError("day must be an integer")
        if self.day < 1 or self.day > 31:
            raise ValueError("day must be between 1 and 31")
        if not date_exists(self.year, self.month, self.day):
            raise ValueError(f"{self.day} {self.month} {self.year} not found")

    @classmethod
    def create(cls, year: int, month: str, day: int) -> Optional[DayPageRequest]:
        """Create instance, returns None if validation fails."""
        try:
            return cls(year=year, month=month, day=day)
        except (ValueError, TypeError):
            return None


@dataclass
class DayAndMonthNamesContext:
    """Output from get_day_and_month_names."""

    full_day_names: IDayNamesOfWeek = field()
    short_day_names: IDayNamesOfWeek = field()
    months_in_year: IMonthNamesOfYear = field()

    def __post_init__(self):
        if not self.full_day_names:
            raise ValueError("full_day_names cannot be empty")
        if not self.short_day_names:
            raise ValueError("short_day_names cannot be empty")
        if not self.months_in_year:
            raise ValueError("months_in_year cannot be empty")
        if len(self.full_day_names) != 7:
            raise ValueError("full_day_names must have exactly 7 entries")
        if len(self.short_day_names) != 7:
            raise ValueError("short_day_names must have exactly 7 entries")
        if len(self.months_in_year) != 12:
            raise ValueError("months_in_year must have exactly 12 entries")

    def to_dict(self) -> dict:
        """Convert to dictionary for template context."""
        return {
            "full_day_names": self.full_day_names,
            "short_day_names": self.short_day_names,
            "months_in_year": self.months_in_year,
        }


@dataclass
class YearNavigationContext:
    """Navigation info computed from year."""

    year: int
    next_year: int = field(init=False)
    prev_year: int = field(init=False)

    def __post_init__(self):
        if not isinstance(self.year, int):
            raise ValueError("year must be an integer")
        if self.year < 1:
            raise ValueError("year must be positive")
        self.next_year = self.year + 1
        self.prev_year = self.year - 1

    def to_dict(self) -> dict:
        """Convert to dictionary for template context."""
        return {
            "year": self.year,
            "next_year": self.next_year,
            "prev_year": self.prev_year,
        }
