import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

// export const MONTH_FORMATS = {
//   parse: {
//     dateInput: { year: 'numeric', month: '2-digit' }, // not used heavily but provided
//   },
//   display: {
//     dateInput: 'MM/yyyy',
//     monthYearLabel: 'MMM yyyy',
//     dateA11yLabel: 'LL',
//     monthYearA11yLabel: 'MMMM yyyy',
//   },
// };

export const MONTH_FORMATS = {
  parse: {
    dateInput: { month: '2-digit', year: 'numeric' },
  },
  display: {
    // dateInput: { month: '2-digit', year: 'numeric' },
    dateInput: { month: 'long', year: 'numeric' },
    monthYearLabel: { month: 'short', year: 'numeric' },
    dateA11yLabel: { month: 'long', year: 'numeric' },
    monthYearA11yLabel: { month: 'long', year: 'numeric' },
  },
};


export const DD_MM_YYYY_FORMAT = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

/**
 * NativeDateAdapter ignores the configured parse format and falls back to
 * JS `Date` parsing, which reads `12/05/2026` as US-style MM/dd (Dec 5).
 * This adapter parses typed text as dd/MM/yyyy so the entered date is kept.
 */
@Injectable()
export class DdMmYyyyDateAdapter extends NativeDateAdapter {
  override parse(value: any): Date | null {
    if (typeof value === 'string') {
      const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
      if (match) {
        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = Number(match[3]);
        const date = new Date(year, month - 1, day);
        const isValid =
          date.getFullYear() === year &&
          date.getMonth() === month - 1 &&
          date.getDate() === day;
        return isValid ? date : null;
      }
    }
    return super.parse(value);
  }
}