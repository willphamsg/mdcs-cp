import { DatePipe } from '@angular/common';
import { TDate } from '@models/common';
import { IDepoList } from '@models/depo';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { CommonService } from '@app/services/common.service';

const DATE_FORMAT = 'yyyy-MM-dd HH:mm:ss';

export function getFilteredDepotIds(
  filterValue: Record<string, unknown> | null | undefined,
  depots: IDepoList[],
  commonService: CommonService
): unknown[] {
  const selected = filterValue?.['depots'] ?? [];
  return Array.isArray(selected) && selected.length > 0
    ? selected
    : commonService.getDepotIds(depots);
}

export function parseEffectiveDates(effectiveDate: unknown): {
  effective_date_from: string;
  effective_date_till: string;
} {
  const datePipe = new DatePipe('en-US');
  let effective_date_from = '';
  let effective_date_till = '';

  if (Array.isArray(effectiveDate)) {
    if (effectiveDate.length > 0) {
      effective_date_from =
        datePipe.transform(effectiveDate[0], DATE_FORMAT) || '';
    }
    if (effectiveDate.length > 1) {
      effective_date_till =
        datePipe.transform(effectiveDate[1], DATE_FORMAT) || '';
    }
  } else if (effectiveDate) {
    effective_date_from = (effectiveDate as TDate).startDate || '';
    effective_date_till = (effectiveDate as TDate).endDate || '';
  }

  return { effective_date_from, effective_date_till };
}

export function buildDepotEffectiveDateFilterConfigs(
  depots: IDepoList[]
): IFilterConfig[] {
  return [
    {
      controlName: 'depots',
      value: [],
      type: 'array',
      options: depots,
    },
    {
      controlName: 'effectiveDate',
      type: 'date-range',
      children: [
        { controlName: 'startDate', value: '' },
        { controlName: 'endDate', value: '' },
      ],
    },
  ];
}
