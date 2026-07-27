import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { IDepoList } from '@app/models/depo';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { initialState } from '@app/store/bus.reducer';
import DummyData from '@data/db.json';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { ViewCardKeyVersionComponent } from './card-key-version.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('ViewCardKeyVersionComponent', () => {
  let component: ViewCardKeyVersionComponent;
  let fixture: ComponentFixture<ViewCardKeyVersionComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;

  const mockDepots: IDepoList[] = DummyData.depot_list;
  const filterServiceSpy = jasmine.createSpyObj('FilterService', [
    'getSelectedFilters',
    'updateFormGroup',
    'clearSelectedFilters',
      'updateSearchValue',
  ]);

  mockDepoService = jasmine.createSpyObj('DepoService', ['depoList$']);
  mockPaginationService = jasmine.createSpyObj('PaginationService', [
    'handlePageEvent',
  ]);

  beforeEach(waitForAsync(() => {
    filterServiceSpy.searchValue$ = of('test');
    filterServiceSpy.filterValues$ = of({ test: ['1'] });

    mockDepoService.depoList$ = of(mockDepots);

    TestBed.configureTestingModule({
    imports: [BrowserAnimationsModule],
    providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: FilterService, useValue: filterServiceSpy },
        provideMockStore({ initialState }),
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ViewCardKeyVersionComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
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

  it('should call sort table on call of sort handler', () => {
    component.sortHandler({ active: 'depot', direction: 'asc' });

    expect(component.params.sort_order).toEqual([{ name: 'depot', desc: false }]);
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  describe('updateDataSource', () => {
    it('should parse and filter dagw card key version string into dagwSource', () => {
      component.updateDataSource({
        records_count: 0,
        card_key_version_list: [],
        dagw_card_key_version: { ver: '1.0,2.0,,3.0,', status: '1' },
      });

      expect(component.dagwSource).toEqual(['1.0', '2.0', '3.0']);
      expect(component.dagwVersionStatus).toBe('1');
    });

    it('should reset dagwSource and default status when no dagw card key version is present', () => {
      component.updateDataSource({
        records_count: 0,
        card_key_version_list: [],
      });

      expect(component.dagwSource).toEqual([]);
      expect(component.dagwVersionStatus).toBe('0');
    });

    it('should mark bus status as failed when any device version status is 2', () => {
      const item: any = {
        bus_num: 'BUS001',
        report_time: '2024-11-01 18:42:59',
        bcv1: 'A1',
        ver1: { value: '1.0', status: '2' },
        bcv2: 'A2',
        ver2: { value: '1.1', status: '0' },
        bcv3: 'A3',
        ver3: { value: '1.2', status: '0' },
        bcv4: 'A4',
        ver4: { value: '1.3', status: '0' },
        bcv5: 'A5',
        ver5: { value: '1.4', status: '0' },
        bcv6: 'A6',
        ver6: { value: '1.5', status: '0' },
      };

      component.updateDataSource({
        records_count: 1,
        card_key_version_list: [item],
      });

      expect(component.tableData[0].device_id.status).toBe('failed');
      // Space-separated report_time should be converted to ISO format
      expect(component.tableData[0].time.value).toBe(
        '2024-11-01T18:42:59'
      );
    });

    it('should mark bus status as inconsistent when a device version status is 1 and none is 2', () => {
      const item: any = {
        bus_num: 'BUS002',
        report_time: '2024-11-02T10:00:00',
        bcv1: 'B1',
        ver1: { value: '2.0', status: '1' },
        bcv2: 'B2',
        ver2: { value: '2.1', status: '0' },
        bcv3: 'B3',
        ver3: { value: '2.2', status: '0' },
        bcv4: 'B4',
        ver4: { value: '2.3', status: '0' },
        bcv5: 'B5',
        ver5: { value: '2.4', status: '0' },
        bcv6: 'B6',
        ver6: { value: '2.5', status: '0' },
      };

      component.updateDataSource({
        records_count: 1,
        card_key_version_list: [item],
      });

      expect(component.tableData[0].device_id.status).toBe('inconsistent');
    });

    it('should leave bus status undefined when no device version is inconsistent or failed', () => {
      const item: any = {
        bus_num: 'BUS003',
        report_time: '2024-11-03T10:00:00',
        bcv1: 'C1',
        ver1: { value: '3.0', status: '0' },
        bcv2: 'C2',
        ver2: { value: '3.1', status: '0' },
        bcv3: 'C3',
        ver3: { value: '3.2', status: '0' },
        bcv4: 'C4',
        ver4: { value: '3.3', status: '0' },
        bcv5: 'C5',
        ver5: { value: '3.4', status: '0' },
        bcv6: 'C6',
        ver6: { value: '3.5', status: '0' },
      };

      component.updateDataSource({
        records_count: 1,
        card_key_version_list: [item],
      });

      expect(component.tableData[0].device_id.status).toBeUndefined();
    });
  });

  describe('onSortChanged', () => {
    it('should set sort_order from ascending sorted column and reload', () => {
      const mockGridApi = jasmine.createSpyObj('GridApi', [
        'getColumnState',
        'setGridOption',
      ]);
      mockGridApi.getColumnState.and.returnValue([
        { colId: 'device_id', sort: 'asc' },
      ]);
      component.onGridReady({ api: mockGridApi } as any);
      spyOn(component, 'reloadHandler');

      component.onSortChanged();

      expect(component.params.sort_order).toEqual([
        { name: 'device_id', desc: false },
      ]);
      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('should set sort_order from descending sorted column', () => {
      const mockGridApi = jasmine.createSpyObj('GridApi', [
        'getColumnState',
        'setGridOption',
      ]);
      mockGridApi.getColumnState.and.returnValue([
        { colId: 'time', sort: 'desc' },
      ]);
      component.onGridReady({ api: mockGridApi } as any);
      spyOn(component, 'reloadHandler');

      component.onSortChanged();

      expect(component.params.sort_order).toEqual([
        { name: 'time', desc: true },
      ]);
    });

    it('should clear sort_order when no column is sorted', () => {
      const mockGridApi = jasmine.createSpyObj('GridApi', [
        'getColumnState',
        'setGridOption',
      ]);
      mockGridApi.getColumnState.and.returnValue([
        { colId: 'device_id', sort: null },
      ]);
      component.onGridReady({ api: mockGridApi } as any);
      spyOn(component, 'reloadHandler');

      component.onSortChanged();

      expect(component.params.sort_order).toEqual([]);
      expect(component.reloadHandler).toHaveBeenCalled();
    });
  });

  describe('hiddenHandler', () => {
    it('should return the chk flag for a known header field', () => {
      expect(component.hiddenHandler('bus_num')).toBe(true);
    });
  });
});
