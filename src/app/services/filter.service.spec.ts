import { TestBed } from '@angular/core/testing';
import { FormBuilder, FormGroup } from '@angular/forms';
import { FilterService } from './filter.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { BehaviorSubject } from 'rxjs';

describe('FilterService', () => {
  let service: FilterService;
  let formBuilder: FormBuilder;
  let mockForm: FormGroup;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FilterService],
    });

    service = TestBed.inject(FilterService);
    formBuilder = TestBed.inject(FormBuilder);
    mockForm = formBuilder.group({
      test: '',
    });
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('updateSelectedFilters', () => {
    it('should update selected filters', () => {
      const selectedFilters = { test: '' };
      service.updateSelectedFilters(selectedFilters);
      service.selectedFilters$.subscribe(filters => {
        expect(filters).toEqual(selectedFilters);
      });
    });
  });

  describe('updateFormGroup', () => {
    it('should update the form group', () => {
      service.updateFormGroup(mockForm);
      service.formGroup$.subscribe(formGroup => {
        expect(formGroup).toEqual(mockForm);
      });
    });
  });

  describe('clearSelectedFilters', () => {
    it('should clear selected filters and reset form controls', () => {
      const selectedFilters = { test: '' };
      service.updateSelectedFilters(selectedFilters);
      service.updateFormGroup(mockForm);

      service.clearSelectedFilters();

      service.selectedFilters$.subscribe((filters: any) => {
        expect(filters.test).toBe('');
      });

      expect(mockForm.get('test')?.value).toBeNull();
    });
  });

  describe('updateFilterValues', () => {
    it('should update filter values', () => {
      const filterValues = { test: ['value1'] };
      service.updateFilterValues(filterValues);
      service.filterValues$.subscribe(values => {
        expect(values).toEqual(jasmine.objectContaining({ test: ['value1'] }));
      });
    });
  });

  describe('removeFilter', () => {
    it('should remove filter and reset the form control', () => {
      const selectedFilters = { test: '' };
      service.updateSelectedFilters(selectedFilters);
      service.updateFormGroup(mockForm);

      service.removeFilter('test', { test: '' });

      service.selectedFilters$.subscribe((filters: any) => {
        console.log(filters.test);
        expect(filters.test).toBe('');
      });

      expect(mockForm.get('test')?.value).toBeNull();
    });
  });

  describe('updateDateRangeFilter', () => {
    it('should update date range filter', () => {
      const dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-01'),
      };

      service.updateDateRangeFilter('effectiveDate', dateRange);

      service.filterValues$.subscribe((values: any) => {
        expect(values.effectiveDate).toEqual([
          '2024-01-01T00:00:00.000Z',
          '2024-01-01T00:00:00.000Z',
        ]);
      });
    });
  });
});
