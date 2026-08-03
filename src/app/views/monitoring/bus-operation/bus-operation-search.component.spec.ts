import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { IDepoList } from '@app/models/depo';
import { AuthService } from '@app/services/auth.service';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { initialState } from '@app/store/bus.reducer';
import DummyData from '@data/db.json';
import { provideMockStore } from '@ngrx/store/testing';
import { of, Subject } from 'rxjs';
import { BusOperationSearchComponent } from './bus-operation-search.component';
import { PaginationService } from '@app/services/pagination.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { BusOperationService } from '@app/services/bus-operation.service';

describe('BusOperationSearchComponent', () => {
  let component: BusOperationSearchComponent;
  let fixture: ComponentFixture<BusOperationSearchComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockBusOperationService: jasmine.SpyObj<BusOperationService>;

  const mockDepots: IDepoList[] = DummyData.depot_list;
  const filterServiceSpy = jasmine.createSpyObj('FilterService', [
    'getSelectedFilters',
    'updateFormGroup',
    'clearSelectedFilters',
      'updateSearchValue',
  ]);
  mockDepoService = jasmine.createSpyObj('DepoService', ['depoList$']);
  mockPaginationService = jasmine.createSpyObj('PaginationService', [
    'paginatedData$',
    'loadData',
    'paginateData',
    'getTotalPages',
    'clearPagination',
    'handlePageEvent',
  ]);
  mockAuthService = jasmine.createSpyObj('AuthService', [
    'isWebSocketEnabled',
    'wsUrl',
    'getToken',
  ]);
  mockBusOperationService = jasmine.createSpyObj('BusOperationService', ['search']);

  const mockOperationPayload = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: '',
    payload: {
      records_count: 2,
      bus_operation_list: [
        {
          depot_id: '1',
          download_status: 0,
          upload_status: 1,
          sam_status: 2,
          conn_status: 1,
          updated_on: '2024-01-01',
        },
      ],
    },
  };

  beforeEach(waitForAsync(() => {
    filterServiceSpy.searchValue$ = of('test');
    filterServiceSpy.filterValues$ = of({ test: ['1'] });

    mockDepoService.depoList$ = of(mockDepots);
    mockAuthService.isWebSocketEnabled.and.returnValue(false);
    mockBusOperationService.search.and.returnValue(of(mockOperationPayload as any));

    TestBed.configureTestingModule({
    imports: [BrowserAnimationsModule],
    providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: FilterService, useValue: filterServiceSpy },
        { provide: AuthService, useValue: mockAuthService },
        { provide: BusOperationService, useValue: mockBusOperationService },
        provideMockStore({ initialState }),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BusOperationSearchComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should set filterConfigs in loadFilterValues', () => {
    component.loadFilterValues();

    expect(component.filterConfigs).toHaveSize(5);
    expect(component.filterConfigs[0].controlName).toBe('depots');
    expect(component.filterConfigs[0].options?.length).toBe(mockDepots.length);
  });

  it('should load depots and call reloadHandler on depo change', () => {
    spyOn(component, 'reloadHandler');

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.depots).toEqual(mockDepots);
    expect(component.reloadHandler).toHaveBeenCalled();
  });

  it('should call pagination service on page change', () => {
    component.onPageChange({ page: 1, pageSize: 10 });

    expect(mockPaginationService.handlePageEvent).toHaveBeenCalled();
    expect(component.params.page_index).toBe(0);
    expect(component.params.page_size).toBe(10);
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  describe('subscribeToDepoChanges', () => {
    it('falls back to empty filter arrays when filterValue is null', () => {
      const search$ = new Subject<string>();
      const filter$ = new Subject<any>();
      const depot$ = new Subject<any>();
      filterServiceSpy.searchValue$ = search$;
      filterServiceSpy.filterValues$ = filter$;
      mockDepoService.depoList$ = depot$;

      const freshFixture = TestBed.createComponent(BusOperationSearchComponent);
      const freshComponent = freshFixture.componentInstance;
      freshFixture.detectChanges();

      depot$.next(mockDepots);
      search$.next('abc');
      filter$.next(null);

      expect(freshComponent.params.search_select_filter['depots']).toEqual([]);
      expect(freshComponent.params.search_select_filter['connections']).toEqual([]);
      freshFixture.destroy();
    });

    it('reloads filter values when the depot count changes from the loaded filterConfigs', () => {
      const search$ = new Subject<string>();
      const filter$ = new Subject<any>();
      const depot$ = new Subject<any>();
      filterServiceSpy.searchValue$ = search$;
      filterServiceSpy.filterValues$ = filter$;
      mockDepoService.depoList$ = depot$;

      const freshFixture = TestBed.createComponent(BusOperationSearchComponent);
      const freshComponent = freshFixture.componentInstance;
      freshFixture.detectChanges();
      spyOn(freshComponent, 'loadFilterValues').and.callThrough();

      depot$.next(mockDepots);
      search$.next('abc');
      filter$.next({});

      expect(freshComponent.loadFilterValues).toHaveBeenCalled();
      freshFixture.destroy();
    });
  });

  describe('reloadHandler', () => {
    it('does not call the service when depots is falsy', () => {
      component.depots = undefined as any;
      mockBusOperationService.search.calls.reset();

      component.reloadHandler();

      expect(mockBusOperationService.search).not.toHaveBeenCalled();
    });

    it('does not update dataSource when response status is not 200', () => {
      mockBusOperationService.search.and.returnValue(
        of({ status: 500, payload: {} } as any)
      );
      component.dataSource = [];

      component.reloadHandler();

      expect(component.dataSource).toEqual([]);
    });
  });

  describe('updateDataSource', () => {
    it('maps bus_operation_status when present', () => {
      component.updateDataSource({
        records_count: 1,
        bus_operation_status: [{ depot_id: '1', conn_status: 1 }],
      });

      expect(component.dataSource.length).toBe(1);
      expect(component.rowCount).toBe(1);
    });

    it('maps bus_operation_list when bus_operation_status is absent', () => {
      component.updateDataSource({
        records_count: 1,
        bus_operation_list: [{ depot_id: '1', conn_status: 0 }],
      });

      expect(component.dataSource.length).toBe(1);
    });

    it('defaults to an empty array when neither field is present', () => {
      component.updateDataSource({ records_count: 0 });

      expect(component.dataSource).toEqual([]);
    });
  });

  describe('mapBusOperationData', () => {
    it('uses the depot on the item when present, without looking it up', () => {
      const depotObj = { depot_id: '1', depot_name: 'Depot A' };
      const mapped = component.mapBusOperationData({ depot: depotObj, depot_id: '2' });
      expect(mapped.depot).toBe(depotObj);
    });

    it('looks up the depot by depot_id when item.depot is absent', () => {
      component.depots = [{ depot_id: '1', depot_name: 'Depot A' } as any];
      const mapped = component.mapBusOperationData({ depot_id: '1' });
      expect(mapped.depot).toEqual({ depot_id: '1', depot_name: 'Depot A' } as any);
    });

    it('treats numeric 1 and boolean true as connected, others as disconnected', () => {
      expect(component.mapBusOperationData({ conn_status: 1 }).conn_status).toBeTrue();
      expect(component.mapBusOperationData({ conn_status: true }).conn_status).toBeTrue();
      expect(component.mapBusOperationData({ conn_status: 0 }).conn_status).toBeFalse();
      expect(component.mapBusOperationData({ conn_status: false }).conn_status).toBeFalse();
    });

    it('falls back to updated_time when updated_on is absent, and null disconnect_time', () => {
      const mapped = component.mapBusOperationData({ updated_time: '2024-01-01' });
      expect(mapped.updated_on).toBe('2024-01-01');
      expect(mapped.disconnect_time).toBeNull();
    });

    it('keeps a provided disconnect_time', () => {
      const mapped = component.mapBusOperationData({ disconnect_time: '2024-02-02' });
      expect(mapped.disconnect_time).toBe('2024-02-02');
    });
  });

  describe('mapStatusCode', () => {
    it('returns the string as-is when already a string', () => {
      expect(component.mapStatusCode('success')).toBe('success');
    });

    it('maps known numeric codes', () => {
      expect(component.mapStatusCode(0)).toBe('failed');
      expect(component.mapStatusCode(1)).toBe('success');
      expect(component.mapStatusCode(2)).toBe('in_progress');
    });

    it('returns a dash for unknown numeric codes', () => {
      expect(component.mapStatusCode(99)).toBe('-');
    });
  });

  describe('hiddenHandler', () => {
    it('returns the chk value from headerData for a known field', () => {
      const field = component.headerData[0];
      expect(component.hiddenHandler(field.field)).toBe(field.chk);
    });
  });

  describe('sortHandler', () => {
    it('sets ascending sort order and reloads', () => {
      spyOn(component, 'reloadHandler');
      component.sortHandler({ active: 'depot_id', direction: 'asc' });
      expect(component.params.sort_order).toEqual([{ name: 'depot_id', desc: false }]);
      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('sets descending sort order for a non-asc direction', () => {
      spyOn(component, 'reloadHandler');
      component.sortHandler({ active: 'depot_id', direction: 'desc' });
      expect(component.params.sort_order).toEqual([{ name: 'depot_id', desc: true }]);
    });
  });

  describe('mapConnectionToNumbers', () => {
    it('returns an empty array for a falsy input', () => {
      expect(component.mapConnectionToNumbers(null as any)).toEqual([]);
    });

    it('wraps a single non-array value', () => {
      expect(component.mapConnectionToNumbers('connect' as any)).toEqual([0]);
    });

    it('maps string and numeric connect/disconnect values', () => {
      expect(component.mapConnectionToNumbers(['0', 'disconnect', 1] as any)).toEqual([
        0, 1, 1,
      ]);
    });

    it('parses unrecognized string values as numbers', () => {
      expect(component.mapConnectionToNumbers(['5'] as any)).toEqual([5]);
    });
  });

  describe('mapStatusToNumbers', () => {
    it('returns an empty array for a falsy input', () => {
      expect(component.mapStatusToNumbers(undefined as any)).toEqual([]);
    });

    it('wraps a single non-array value', () => {
      expect(component.mapStatusToNumbers('failed' as any)).toEqual([0]);
    });

    it('maps string and numeric status values', () => {
      expect(
        component.mapStatusToNumbers(['0', 'success', '2', 3] as any)
      ).toEqual([0, 1, 2, 3]);
    });

    it('parses unrecognized string values as numbers', () => {
      expect(component.mapStatusToNumbers(['7'] as any)).toEqual([7]);
    });
  });
});
