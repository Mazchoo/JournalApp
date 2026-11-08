"""Forms validating parameters taken from page URLs"""

from django.forms import Form, CharField, ValidationError

from main.config import DateConstants


class MonthNameForm(Form):
    """Validates that a month parameter is a valid month name."""

    month = CharField()

    def clean_month(self) -> str:
        """Ensure month is a valid month name."""
        month = self.cleaned_data["month"]
        if month not in DateConstants.month_names:
            raise ValidationError(f"month must be one of {DateConstants.month_names}")
        return month
