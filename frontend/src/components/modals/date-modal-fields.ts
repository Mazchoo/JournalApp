/** Day/month/year selects inside the move-date modal. */
export class DateModalFields {
  private day: HTMLSelectElement | null = null;
  private month: HTMLSelectElement | null = null;
  private year: HTMLSelectElement | null = null;

  /** Query the three date selects. */
  bind(): void {
    this.day = document.getElementById(
      "date-modal-day",
    ) as HTMLSelectElement | null;
    this.month = document.getElementById(
      "date-modal-month",
    ) as HTMLSelectElement | null;
    this.year = document.getElementById(
      "date-modal-year",
    ) as HTMLSelectElement | null;
  }

  /** Build a YYYY-MM-DD slug from the current select values. */
  destinationSlug(): string {
    this.ensureBound();
    let destDay = selectValue(this.day, "date-modal-day");
    if (destDay.length === 1) destDay = "0" + destDay;
    let destMonth = String((this.month?.selectedIndex ?? 0) + 1);
    if (this.month === null) {
      console.error("DateModalFields: #date-modal-month does not exist");
    }
    if (destMonth.length === 1) destMonth = "0" + destMonth;
    const destYear = selectValue(this.year, "date-modal-year");
    return `${destYear}-${destMonth}-${destDay}`;
  }

  /** Re-query if a cached select was replaced. */
  private ensureBound(): void {
    if (
      this.day === null ||
      !this.day.isConnected ||
      this.month === null ||
      !this.month.isConnected ||
      this.year === null ||
      !this.year.isConnected
    ) {
      this.bind();
    }
  }
}

/** Return a select's value, logging if the node is missing. */
function selectValue(
  select: HTMLSelectElement | null,
  elementId: string,
): string {
  if (select === null) {
    console.error(`DateModalFields: #${elementId} does not exist`);
    return "";
  }
  return select.value;
}
