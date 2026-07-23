import { ComponentFixture, TestBed, waitForAsync, fakeAsync, tick } from '@angular/core/testing';
import { FilterComponent } from './filter.component';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { FilterService } from '@app/services/filter.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { of } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('FilterComponent', () => {
  let component: FilterComponent;
  let fixture: ComponentFixture<FilterComponent>;
  let filterService: jasmine.SpyObj<FilterService>;

  const mockFilterConfigs: IFilterConfig[] = [
    {
      controlName: 'depot',
      type: 'select',
      value: '',
      options: [{ id: '1', value: 'Depot A' }],
    },
    { controlName: 'dateRange', type: 'date-range', value: '', children: [] },
  ];

  beforeEach(waitForAsync(() => {
    const filterServiceSpy = jasmine.createSpyObj('FilterService', [
      'updateSearchValue',
      'updateFormGroup',
      'updateSelectedFilters',
      'updateFilterConfigs',
      'updateFilterValues',
      'updateDateRangeFilter',
      'clearSelectedFilters',
    ], {
      searchValue$: of(''),
    });

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, ReactiveFormsModule],
      providers: [{ provide: FilterService, useValue: filterServiceSpy }],
    }).compileComponents();

    filterService = TestBed.inject(FilterService) as jasmine.SpyObj<FilterService>;
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FilterComponent);
    component = fixture.componentInstance;
    component.filterConfigs = mockFilterConfigs;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.enableSearch).toBeTrue();
    expect(component.placeholder).toBe('Search by keyword');
  });

  it('should initialize the form on ngOnChanges when filterConfigs changes', () => {
    const initializeFormSpy = spyOn(component, 'initializeForm');
    component.ngOnChanges({
      filterConfigs: {
        currentValue: mockFilterConfigs,
        previousValue: [],
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    expect(initializeFormSpy).toHaveBeenCalled();
  });

  it('should not reinitialize form when filterConfigs has same value', () => {
    const initializeFormSpy = spyOn(component, 'initializeForm');
    component.ngOnChanges({
      filterConfigs: {
        currentValue: mockFilterConfigs,
        previousValue: mockFilterConfigs,
        firstChange: false,
        isFirstChange: () => false,
      },
    });
    expect(initializeFormSpy).not.toHaveBeenCalled();
  });

  it('should initialize form and subscribe to searchControl on ngOnInit', () => {
    const initializeFormSpy = spyOn(component, 'initializeForm');
    component.ngOnInit();
    expect(initializeFormSpy).toHaveBeenCalled();
  });

  it('should debounce and update search value via service', fakeAsync(() => {
    component.ngOnInit();
    component.searchControl.setValue('hello');
    tick(1000);
    expect(filterService.updateSearchValue).toHaveBeenCalledWith('hello');
  }));

  it('should apply filters and call FilterService methods', () => {
    component.applyFilter();

    expect(filterService.updateSelectedFilters).toHaveBeenCalled();
    expect(filterService.updateFilterConfigs).toHaveBeenCalledWith(mockFilterConfigs);
    expect(filterService.updateFormGroup).toHaveBeenCalled();
  });

  it('should clear filter and call clearSelectedFilters', () => {
    component.clearFilter();
    expect(filterService.clearSelectedFilters).toHaveBeenCalled();
  });

  it('should get applied filters from form values', () => {
    component.filterForm = new FormGroup({
      depot: new FormControl('Depot 1'),
      dateRange: new FormControl(null),
    });

    const appliedFilters = component.getAppliedFilters();
    expect(appliedFilters['depot']).toEqual('Depot 1');
  });

  it('should skip null/empty controls in getAppliedFilters', () => {
    component.filterForm = new FormGroup({
      depot: new FormControl(null),
      dateRange: new FormControl(null),
    });

    const appliedFilters = component.getAppliedFilters();
    expect(Object.keys(appliedFilters)).toHaveSize(0);
  });

  it('should get config options for a config key', () => {
    const options = component['getConfigOptions']('depot');
    expect(options).toEqual([{ id: '1', value: 'Depot A' }]);
  });

  it('should return empty array for unknown config key options', () => {
    const options = component['getConfigOptions']('unknown');
    expect(options).toEqual([]);
  });

  it('should get config type for a config key', () => {
    const type = component['getConfigType']('depot');
    expect(type).toEqual('select');
  });

  it('should return empty string for unknown config key type', () => {
    const type = component['getConfigType']('unknown');
    expect(type).toEqual('');
  });

  it('should return depot_name for currDepot display label', () => {
    const label = component.getOptionDisplayLabel('currDepot', { depot_name: 'Main Depot', value: 'other' });
    expect(label).toBe('Main Depot');
  });

  it('should return value for non-currDepot display label', () => {
    const label = component.getOptionDisplayLabel('status', { value: 'Active' });
    expect(label).toBe('Active');
  });

  it('should return depot_id for currDepot option value', () => {
    const val = component.getOptionValue('currDepot', { depot_id: '42', id: '1' });
    expect(val).toBe('42');
  });

  it('should return value for non-currDepot option value', () => {
    const val = component.getOptionValue('status', { value: 'active', id: '1' });
    expect(val).toBe('active');
  });

  it('should allow numeric keys in onDateInputKeydown', () => {
    const event = new KeyboardEvent('keydown', { key: '5' });
    spyOn(event, 'preventDefault');
    component.onDateInputKeydown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('should allow slash in onDateInputKeydown', () => {
    const event = new KeyboardEvent('keydown', { key: '/' });
    spyOn(event, 'preventDefault');
    component.onDateInputKeydown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('should prevent letter keys in onDateInputKeydown', () => {
    const event = new KeyboardEvent('keydown', { key: 'a' });
    spyOn(event, 'preventDefault');
    component.onDateInputKeydown(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should allow navigation keys in onDateInputKeydown', () => {
    const event = new KeyboardEvent('keydown', { key: 'Backspace' });
    spyOn(event, 'preventDefault');
    component.onDateInputKeydown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('should allow ctrl+c in onDateInputKeydown', () => {
    const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true });
    spyOn(event, 'preventDefault');
    component.onDateInputKeydown(event);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });

  it('should parse typed DD/MM/YYYY input into a Date for single date controls', () => {
    component.filterForm = new FormGroup({
      businessDate: new FormControl(null),
    });

    const input = document.createElement('input');
    input.setAttribute('formControlName', 'businessDate');
    input.value = '11052026';

    component.onDateInput({ target: input } as unknown as Event);

    expect(input.value).toBe('11/05/2026');
    expect(component.filterForm.get('businessDate')?.value).toEqual(
      new Date(2026, 4, 11)
    );
  });

  it('should clear single date control value for incomplete DD/MM/YYYY input', () => {
    component.filterForm = new FormGroup({
      businessDate: new FormControl(new Date(2026, 4, 11)),
    });

    const input = document.createElement('input');
    input.setAttribute('formControlName', 'businessDate');
    input.value = '1105';

    component.onDateInput({ target: input } as unknown as Event);

    expect(input.value).toBe('11/05');
    expect(component.filterForm.get('businessDate')?.value).toBeNull();
  });

  it('should parse typed DD/MM/YYYY input into a Date for date range controls', () => {
    component.filterForm = new FormGroup({
      dateRange: new FormGroup({
        startDate: new FormControl(null),
        endDate: new FormControl(null),
      }),
    });

    const wrapper = document.createElement('div');
    wrapper.setAttribute('formGroupName', 'dateRange');
    const input = document.createElement('input');
    input.setAttribute('formControlName', 'startDate');
    input.value = '12062026';
    wrapper.appendChild(input);
    document.body.appendChild(wrapper);

    try {
      component.onDateRangeInput({ target: input } as unknown as Event);

      expect(input.value).toBe('12/06/2026');
      expect(component.filterForm.get('dateRange.startDate')?.value).toEqual(
        new Date(2026, 5, 12)
      );
    } finally {
      wrapper.remove();
    }
  });

  it('should clean up on ngOnDestroy', () => {
    component.ngOnDestroy();
    expect(filterService.updateSearchValue).toHaveBeenCalledWith('');
  });
});
