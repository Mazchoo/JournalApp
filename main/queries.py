"""QuerySets for indexed model lookups"""

from django.db.models import QuerySet


class EntryQuerySet(QuerySet):
    """Lookups that use Entry's year/month indexes."""

    def in_year_month(self, year: int, month: int):
        """Filter entries by year and month using entry_year_month_idx."""
        return self.filter(year=year, month=month)

    def in_year(self, year: int):
        """Filter entries by year using entry_year_idx."""
        return self.filter(year=year)
