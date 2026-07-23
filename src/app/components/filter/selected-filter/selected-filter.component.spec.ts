import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FilterService } from '@app/services/filter.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { of } from 'rxjs';
import { SelectedFilterComponent } from './selected-filter.component';

describe('SelectedFilterComponent', () => {
  let component: SelectedFilterComponent;
  let fixture: ComponentFixture<SelectedFilterComponent>;
  let mockFilterService: any;

  const mockFilterConfigs: IFilterConfig[] = [
    {
      controlName: 'depot',
      type: 'select',
      value: '',
      options: [{ id: '1', value: '' }],
    },
    {
      controlName: 'effectiveDate',
      type: 'date-range',
      value: '',
      children: [],
    },
  ];

  const mockSelectedFilters = {
    depot: 'test',
  };

  beforeEach(waitForAsync(() => {
    mockFilterService = jasmine.createSpyObj('FilterService', [
      'clearSelectedFilters',
      'removeFilter',
      'getSelectedFilters',
      'updateFilterValues',
    ]);
    mockFilterService.selectedFilters$ = of(mockSelectedFilters);
    mockFilterService.filterConfigs$ = of(mockFilterConfigs);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [{ provide: FilterService, useValue: mockFilterService }],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SelectedFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should assign selectedFilters and filterConfigs on ngOnInit', () => {
    component.ngOnInit();
    expect(component.selectedFilters).toBe(mockFilterService.selectedFilters$);
    expect(component.filterConfigs).toBe(mockFilterService.filterConfigs$);
  });

  it('should clear selected filters on ngOnDestroy', () => {
    component.ngOnDestroy();
    expect(mockFilterService.clearSelectedFilters).toHaveBeenCalled();
  });

  it('isFilterNotEmpty should return true for non-empty string value', done => {
    component.isFilterNotEmpty('depot').subscribe(res => {
      expect(res).toBeTrue();
      done();
    });
  });

  it('isFilterNotEmpty should return false for empty string value', done => {
    mockFilterService.selectedFilters$ = of({ depot: '' });
    component.isFilterNotEmpty('depot').subscribe(res => {
      expect(res).toBeFalse();
      done();
    });
  });

  it('isFilterNotEmpty should return false for null value', done => {
    mockFilterService.selectedFilters$ = of({ depot: null });
    component.isFilterNotEmpty('depot').subscribe(res => {
      expect(res).toBeFalse();
      done();
    });
  });

  it('isFilterNotEmpty should return true for effectiveDate with both dates', done => {
    mockFilterService.selectedFilters$ = of({
      effectiveDate: { startDate: '2024-01-01', endDate: '2024-12-31' },
    });
    component.isFilterNotEmpty('effectiveDate').subscribe(res => {
      expect(res).toBeTrue();
      done();
    });
  });

  it('isFilterNotEmpty should return false for effectiveDate with null startDate', done => {
    mockFilterService.selectedFilters$ = of({
      effectiveDate: { startDate: null, endDate: '2024-12-31' },
    });
    component.isFilterNotEmpty('effectiveDate').subscribe(res => {
      expect(res).toBeFalse();
      done();
    });
  });

  it('isFilterNotEmpty should handle dateRange key the same as effectiveDate', done => {
    mockFilterService.selectedFilters$ = of({
      dateRange: { startDate: '2024-01-01', endDate: '2024-12-31' },
    });
    component.isFilterNotEmpty('dateRange').subscribe(res => {
      expect(res).toBeTrue();
      done();
    });
  });

  it('isDateRangeFilter should return true for effectiveDate with valid dates', done => {
    mockFilterService.selectedFilters$ = of({
      effectiveDate: { startDate: '12-12-2024', endDate: '12-12-2024' },
    });
    component.isDateRangeFilter('effectiveDate').subscribe(isDateRange => {
      expect(isDateRange).toBeTrue();
      done();
    });
  });

  it('isDateRangeFilter should return false for non-date-range key', done => {
    mockFilterService.selectedFilters$ = of({ depot: 'test' });
    component.isDateRangeFilter('depot').subscribe(isDateRange => {
      expect(isDateRange).toBeFalse();
      done();
    });
  });

  it('isDateRangeFilter should return false when effectiveDate value is null', done => {
    mockFilterService.selectedFilters$ = of({ effectiveDate: null });
    component.isDateRangeFilter('effectiveDate').subscribe(isDateRange => {
      expect(isDateRange).toBeFalsy();
      done();
    });
  });

  it('isDateRangeFilter should return false when startDate is null', done => {
    mockFilterService.selectedFilters$ = of({
      effectiveDate: { startDate: null, endDate: '2024-01-01' },
    });
    component.isDateRangeFilter('effectiveDate').subscribe(isDateRange => {
      expect(isDateRange).toBeFalse();
      done();
    });
  });

  it('removeFilter should call removeFilter and updateFilterValues', () => {
    mockFilterService.getSelectedFilters.and.returnValue(mockSelectedFilters);

    component.removeFilter('depot');

    expect(mockFilterService.removeFilter).toHaveBeenCalledWith('depot', {
      ...mockSelectedFilters,
      depot: '',
    });
    expect(mockFilterService.updateFilterValues).toHaveBeenCalledWith({ depot: [] });
  });
});
