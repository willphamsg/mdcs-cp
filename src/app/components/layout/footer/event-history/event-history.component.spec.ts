import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventHistoryComponent } from './event-history.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideMockStore } from '@ngrx/store/testing';
import { EventHistoryService } from '@app/services/event-history.service';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { BehaviorSubject, of } from 'rxjs';

describe('EventHistoryComponent', () => {
  let component: EventHistoryComponent;
  let fixture: ComponentFixture<EventHistoryComponent>;
  let mockEventHistoryService: jasmine.SpyObj<EventHistoryService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let depoListSubject: BehaviorSubject<any[]>;
  let searchValueSubject: BehaviorSubject<string>;
  let filterValuesSubject: BehaviorSubject<any>;

  const mockDepots: any[] = [
    { id: 1, version: 1, depot_id: '1', depot_code: 'DA', depot_name: 'Depot A' },
    { id: 2, version: 1, depot_id: '2', depot_code: 'DB', depot_name: 'Depot B' },
  ];

  beforeEach(async () => {
    mockEventHistoryService = jasmine.createSpyObj('EventHistoryService', ['search']);
    mockEventHistoryService.search.and.returnValue(
      of({ status: 200, status_code: 'OK', timestamp: Date.now(), message: 'success', payload: { event_history_list: [], records_count: 0 } })
    );

    const mockAuthService = jasmine.createSpyObj('AuthService', ['getSvcProvCode', 'isDagw']);
    mockAuthService.getSvcProvCode.and.returnValue('SVC01');
    mockAuthService.isDagw.and.returnValue(false);

    const mockCommonService = jasmine.createSpyObj('CommonService', ['getDepoList', 'getDepotIds']);
    mockCommonService.getDepoList.and.returnValue(of([]));
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);

    depoListSubject = new BehaviorSubject<any[]>(mockDepots);
    searchValueSubject = new BehaviorSubject<string>('');
    filterValuesSubject = new BehaviorSubject<any>({});

    const mockDepoService = {
      depo$: of('1'),
      depoList$: depoListSubject.asObservable(),
      updateDepo: jasmine.createSpy(),
    };

    const mockFilterService = {
      searchValue$: searchValueSubject.asObservable(),
      filterValues$: filterValuesSubject.asObservable(),
      selectedFilters$: of({}),
      filterConfigs$: of([]),
      updateSearchValue: jasmine.createSpy(),
      updateFormGroup: jasmine.createSpy(),
      updateSelectedFilters: jasmine.createSpy(),
      updateFilterConfigs: jasmine.createSpy(),
      clearSelectedFilters: jasmine.createSpy(),
    };

    mockPaginationService = jasmine.createSpyObj('PaginationService',
      ['handlePageEvent', 'getTotalPages', 'clearPagination', 'setItemsPerPage', 'goToPage'],
      { currentPage: 1, pageSize: 50 }
    );
    mockPaginationService.getTotalPages.and.returnValue(0);

    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, EventHistoryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore(),
        { provide: EventHistoryService, useValue: mockEventHistoryService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: DepoService, useValue: mockDepoService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: PaginationService, useValue: mockPaginationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EventHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should derive displayedColumns from non-hidden headers', () => {
    const nonHiddenFields = component.headerData
      .filter(x => x.hidden === false)
      .map(x => x.field);
    expect(component.displayedColumns).toEqual(nonHiddenFields);
    expect(component.displayedColumns).toContain('id');
    expect(component.displayedColumns).toContain('depot');
    expect(component.displayedColumns).not.toContain('depot_id');
  });

  it('should initialize filterConfigs with depots and effectiveDate', () => {
    expect(component.filterConfigs).toHaveSize(2);
    expect(component.filterConfigs[0].controlName).toBe('depots');
    expect(component.filterConfigs[0].type).toBe('array');
    expect(component.filterConfigs[1].controlName).toBe('effectiveDate');
    expect(component.filterConfigs[1].type).toBe('date-range');
  });

  it('should populate depot options in filterConfigs from depoList', () => {
    expect(component.filterConfigs[0].options).toEqual(mockDepots);
  });

  it('should call search on init via subscribeToDepoChanges', () => {
    expect(mockEventHistoryService.search).toHaveBeenCalled();
  });

  it('should set search_text from searchValue$ changes', () => {
    searchValueSubject.next('test search');
    expect(component.params.search_text).toBe('test search');
  });

  it('should reset page to 1 on filter/search change', () => {
    component.currentPage = 5;
    component.params.page_index = 4;
    searchValueSubject.next('new search');
    expect(component.currentPage).toBe(1);
    expect(component.params.page_index).toBe(0);
  });

  it('should use depot filter values when provided', () => {
    filterValuesSubject.next({ depots: ['3', '4'] });
    expect(component.params.search_select_filter['depot_id_list']).toEqual(['3', '4']);
  });

  it('should fall back to all depot ids when depots filter is empty', () => {
    filterValuesSubject.next({ depots: [] });
    expect(component.params.search_select_filter['depot_id_list']).toEqual(['1', '2']);
  });

  it('should set serviceProviderCode from AuthService', () => {
    expect(component.params.search_select_filter['serviceProviderCode']).toBe('SVC01');
  });

  it('should set effective dates from date-range filter (TDate format)', () => {
    filterValuesSubject.next({
      effectiveDate: { startDate: '2024-01-01', endDate: '2024-12-31' },
    });
    expect(component.params.search_select_filter['effective_date_from']).toBe('2024-01-01');
    expect(component.params.search_select_filter['effective_date_till']).toBe('2024-12-31');
  });

  it('should updateDataSource with mapped data', () => {
    component.depots = mockDepots;
    const payload = {
      records_count: 2,
      event_history_list: [
        { depot_id: 1, description: 'Event A' },
        { depot_id: 2, description: 'Event B' },
      ],
    };
    component.updateDataSource(payload);
    expect(component.rowCount).toBe(2);
    expect(component.dataSource).toHaveSize(2);
    expect(component.dataSource[0].depot).toBe('Depot A');
    expect(component.dataSource[1].depot).toBe('Depot B');
  });

  it('mapDataList should map depot name from depots array', () => {
    component.depots = mockDepots;
    const result = component.mapDataList({ depot_id: 1, description: 'Test' } as any);
    expect(result.depot).toBe('Depot A');
    expect(result.description).toBe('Test');
  });

  it('mapDataList should return undefined depot for unknown depot_id', () => {
    component.depots = mockDepots;
    const result = component.mapDataList({ depot_id: 999, description: 'Unknown' } as any);
    expect(result.depot).toBeUndefined();
  });

  it('hiddenHandler should return chk value for given field', () => {
    expect(component.hiddenHandler('id')).toBeTrue();
    expect(component.hiddenHandler('depot_id')).toBeFalse();
  });

  it('onPageChange should delegate to paginationService.handlePageEvent', () => {
    component.onPageChange({ page: 3, pageSize: 50 });
    expect(component.currentPage).toBe(3);
    expect(mockPaginationService.handlePageEvent).toHaveBeenCalled();
  });

  it('onPageChange should coerce string pageSize to number', () => {
    component.onPageChange({ page: 2, pageSize: '25' as any });
    const callArgs = mockPaginationService.handlePageEvent.calls.mostRecent().args;
    expect(callArgs[1].pageSize).toBe(25);
  });

  it('sortHandler should set sort_order and reload', () => {
    mockEventHistoryService.search.calls.reset();
    component.sortHandler({ active: 'update_time', direction: 'asc' });
    expect(component.params.sort_order).toEqual([{ name: 'update_time', desc: false }]);
    expect(mockEventHistoryService.search).toHaveBeenCalled();
  });

  it('sortHandler desc direction sets desc to true', () => {
    component.sortHandler({ active: 'description', direction: 'desc' });
    expect(component.params.sort_order).toEqual([{ name: 'description', desc: true }]);
  });

  it('ngOnDestroy should complete destroy$ and stop subscriptions', () => {
    spyOn(component['destroy$'], 'next');
    spyOn(component['destroy$'], 'complete');
    component.ngOnDestroy();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
