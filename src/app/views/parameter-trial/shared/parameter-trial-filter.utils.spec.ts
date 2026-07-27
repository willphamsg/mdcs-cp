import { CommonService } from '@app/services/common.service';
import { IDepoList } from '@models/depo';
import {
  buildDepotEffectiveDateFilterConfigs,
  getFilteredDepotIds,
  parseEffectiveDates,
} from './parameter-trial-filter.utils';

describe('parameter-trial-filter.utils', () => {
  const depots: IDepoList[] = [
    {
      id: 1,
      version: 1,
      depot_id: 'D1',
      depot_code: 'D1',
      depot_name: 'Depot 1',
    },
    {
      id: 2,
      version: 1,
      depot_id: 'D2',
      depot_code: 'D2',
      depot_name: 'Depot 2',
    },
  ];

  describe('getFilteredDepotIds', () => {
    let commonService: jasmine.SpyObj<CommonService>;

    beforeEach(() => {
      commonService = jasmine.createSpyObj<CommonService>('CommonService', [
        'getDepotIds',
      ]);
    });

    it('returns the depots selected in the filter value directly when non-empty', () => {
      const filterValue = { depots: ['D1', 'D2'] };

      const result = getFilteredDepotIds(filterValue, depots, commonService);

      expect(result).toEqual(['D1', 'D2']);
      expect(commonService.getDepotIds).not.toHaveBeenCalled();
    });

    it('falls back to commonService.getDepotIds when the filter value has no depots', () => {
      commonService.getDepotIds.and.returnValue(['D1', 'D2']);

      const result = getFilteredDepotIds({}, depots, commonService);

      expect(commonService.getDepotIds).toHaveBeenCalledWith(depots);
      expect(result).toEqual(['D1', 'D2']);
    });

    it('falls back to commonService.getDepotIds when depots in the filter value is an empty array', () => {
      commonService.getDepotIds.and.returnValue(['D1', 'D2']);

      const result = getFilteredDepotIds(
        { depots: [] },
        depots,
        commonService
      );

      expect(commonService.getDepotIds).toHaveBeenCalledWith(depots);
      expect(result).toEqual(['D1', 'D2']);
    });

    it('falls back to commonService.getDepotIds when the filter value is null', () => {
      commonService.getDepotIds.and.returnValue(['D1']);

      const result = getFilteredDepotIds(null, depots, commonService);

      expect(commonService.getDepotIds).toHaveBeenCalledWith(depots);
      expect(result).toEqual(['D1']);
    });
  });

  describe('parseEffectiveDates', () => {
    it('formats both start and end dates when given a 2-element array', () => {
      const start = new Date('2024-01-01T10:00:00');
      const end = new Date('2024-02-01T12:30:00');

      const result = parseEffectiveDates([start, end]);

      expect(result.effective_date_from).toBe('2024-01-01 10:00:00');
      expect(result.effective_date_till).toBe('2024-02-01 12:30:00');
    });

    it('formats only the start date when given a 1-element array', () => {
      const start = new Date('2024-01-01T10:00:00');

      const result = parseEffectiveDates([start]);

      expect(result.effective_date_from).toBe('2024-01-01 10:00:00');
      expect(result.effective_date_till).toBe('');
    });

    it('returns empty strings for both when given an empty array', () => {
      const result = parseEffectiveDates([]);

      expect(result.effective_date_from).toBe('');
      expect(result.effective_date_till).toBe('');
    });

    it('reads startDate/endDate directly from a non-array TDate-like object', () => {
      const result = parseEffectiveDates({
        startDate: '2024-01-01 00:00:00',
        endDate: '2024-01-31 23:59:59',
      });

      expect(result.effective_date_from).toBe('2024-01-01 00:00:00');
      expect(result.effective_date_till).toBe('2024-01-31 23:59:59');
    });

    it('returns empty strings when the TDate-like object has missing fields', () => {
      const result = parseEffectiveDates({});

      expect(result.effective_date_from).toBe('');
      expect(result.effective_date_till).toBe('');
    });

    it('returns empty strings when effectiveDate is undefined', () => {
      const result = parseEffectiveDates(undefined);

      expect(result.effective_date_from).toBe('');
      expect(result.effective_date_till).toBe('');
    });

    it('returns empty strings when effectiveDate is null', () => {
      const result = parseEffectiveDates(null);

      expect(result.effective_date_from).toBe('');
      expect(result.effective_date_till).toBe('');
    });
  });

  describe('buildDepotEffectiveDateFilterConfigs', () => {
    it('builds filter configs for depots and the effective date range', () => {
      const configs = buildDepotEffectiveDateFilterConfigs(depots);

      expect(configs).toEqual([
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
      ]);
    });
  });
});
