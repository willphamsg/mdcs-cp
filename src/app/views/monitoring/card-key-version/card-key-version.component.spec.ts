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
import { NoDataOverlay, ViewCardKeyVersionComponent } from './card-key-version.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ManageCardKeyVersionService } from '@services/card-key-version.service';

describe('ViewCardKeyVersionComponent', () => {
  let component: ViewCardKeyVersionComponent;
  let fixture: ComponentFixture<ViewCardKeyVersionComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockManageCardKeyVersionService: jasmine.SpyObj<ManageCardKeyVersionService>;

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

    mockManageCardKeyVersionService = jasmine.createSpyObj('ManageCardKeyVersionService', [
      'search',
    ]);
    mockManageCardKeyVersionService.search.and.returnValue(
      of({ status: 200, payload: { records_count: 0, card_key_version_list: [] } } as any)
    );

    TestBed.configureTestingModule({
    imports: [BrowserAnimationsModule],
    providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: FilterService, useValue: filterServiceSpy },
        { provide: ManageCardKeyVersionService, useValue: mockManageCardKeyVersionService },
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

  it('should populate filterConfigs via loadFilterValues', () => {
    component.depots = mockDepots;
    component.loadFilterValues();

    expect(component.filterConfigs).toHaveSize(1);
    expect(component.filterConfigs[0].controlName).toBe('depots');
    expect(component.filterConfigs[0].options).toEqual(mockDepots);
  });

  it('should call searchText after the search control debounce period', fakeAsync(() => {
    spyOn(component, 'searchText');

    component.searchControl.setValue('bus001');
    tick(1000);

    expect(component.searchText).toHaveBeenCalledWith('bus001');
  }));

  describe('searchText / searchDepot / searchStatus', () => {
    it('should set search_text and reload', () => {
      spyOn(component, 'reloadHandler');

      component.searchText('abc');

      expect(component.params.search_text).toBe('abc');
      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('should set depot_id_list and reload', () => {
      spyOn(component, 'reloadHandler');
      component.depotSelected = '5';

      component.searchDepot();

      expect(component.params.search_select_filter['depot_id_list']).toEqual(['5']);
      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('should set status_list to [1] when chkInconsistent is true', () => {
      spyOn(component, 'reloadHandler');
      component.chkInconsistent = true;

      component.searchStatus();

      expect(component.params.search_select_filter['status_list']).toEqual([1]);
    });

    it('should set status_list to [] when chkInconsistent is false', () => {
      spyOn(component, 'reloadHandler');
      component.chkInconsistent = false;

      component.searchStatus();

      expect(component.params.search_select_filter['status_list']).toEqual([]);
    });
  });

  describe('reloadHandler', () => {
    it('should update dataSource when the search response status is 200', () => {
      mockManageCardKeyVersionService.search.and.returnValue(
        of({
          status: 200,
          payload: { records_count: 1, card_key_version_list: [{ bus_num: 'B1', report_time: '2024-01-01T00:00:00' }] },
        } as any)
      );

      component.reloadHandler();

      expect(component.dataSource.length).toBe(1);
    });

    it('should not update dataSource when the search response status is not 200', () => {
      mockManageCardKeyVersionService.search.and.returnValue(of({ status: 500, payload: null } as any));
      spyOn(component, 'updateDataSource');

      component.reloadHandler();

      expect(component.updateDataSource).not.toHaveBeenCalled();
    });
  });

  describe('onGridReady', () => {
    it('should not push row data to the grid when tableData is empty', () => {
      component.tableData = [];
      const mockGridApi = jasmine.createSpyObj('GridApi', ['setGridOption']);

      component.onGridReady({ api: mockGridApi } as any);

      expect(mockGridApi.setGridOption).not.toHaveBeenCalled();
    });

    it('should push row data to the grid when tableData has items', () => {
      component.tableData = [{ device_id: { value: 'B1' } }];
      const mockGridApi = jasmine.createSpyObj('GridApi', ['setGridOption']);

      component.onGridReady({ api: mockGridApi } as any);

      expect(mockGridApi.setGridOption).toHaveBeenCalledWith('rowData', component.tableData);
    });

    it('should update the grid defaultColDef minWidth on window resize', () => {
      const mockGridApi = jasmine.createSpyObj('GridApi', ['setGridOption']);
      component.onGridReady({ api: mockGridApi } as any);
      mockGridApi.setGridOption.calls.reset();

      window.dispatchEvent(new Event('resize'));

      expect(mockGridApi.setGridOption).toHaveBeenCalledWith(
        'defaultColDef',
        jasmine.any(Object)
      );
    });
  });

  describe('removeZeroes', () => {
    it('should filter out "00" tokens and keep the rest', () => {
      expect(component.removeZeroes('01,00,02,00,03')).toBe('01,02,03');
    });

    it('should leave a string with no zero tokens untouched', () => {
      expect(component.removeZeroes('01,02,03')).toBe('01,02,03');
    });
  });

  describe('getVersionValue', () => {
    it('should return the string value when the object has a defined value', () => {
      expect(component['getVersionValue']({ value: '1.2', status: '0' })).toBe('1.2');
    });

    it("should return '-' when the object's value is null", () => {
      expect(component['getVersionValue']({ value: null, status: '0' })).toBe('-');
    });

    it("should return '-' when the object's value is an empty string", () => {
      expect(component['getVersionValue']({ value: '', status: '0' })).toBe('-');
    });

    it("should return '-' for null/undefined/empty non-object versions", () => {
      expect(component['getVersionValue'](null)).toBe('-');
      expect(component['getVersionValue'](undefined)).toBe('-');
      expect(component['getVersionValue']('')).toBe('-');
    });

    it('should stringify a plain non-object version value', () => {
      expect(component['getVersionValue']('1.5')).toBe('1.5');
      expect(component['getVersionValue'](7)).toBe('7');
    });
  });

  describe('getVersionStatus', () => {
    it("should map status '1' to inconsistent", () => {
      expect(component['getVersionStatus']({ status: '1' })).toBe('inconsistent');
    });

    it("should map status '2' to failed", () => {
      expect(component['getVersionStatus']({ status: '2' })).toBe('failed');
    });

    it("should return undefined for status '0'", () => {
      expect(component['getVersionStatus']({ status: '0' })).toBeUndefined();
    });

    it('should return undefined for an unrecognized status (default branch)', () => {
      expect(component['getVersionStatus']({ status: '9' })).toBeUndefined();
    });

    it('should return undefined when version is not an object with a status', () => {
      expect(component['getVersionStatus']('1.0')).toBeUndefined();
      expect(component['getVersionStatus'](null)).toBeUndefined();
      expect(component['getVersionStatus']({})).toBeUndefined();
    });
  });

  describe('formatReportTime', () => {
    it('should convert a space-separated time to ISO format', () => {
      expect(component['formatReportTime']('2024-11-01 18:42:59')).toBe(
        '2024-11-01T18:42:59'
      );
    });

    it('should leave an already-ISO time untouched', () => {
      expect(component['formatReportTime']('2024-11-01T18:42:59')).toBe(
        '2024-11-01T18:42:59'
      );
    });

    it('should pass through a falsy report time unchanged', () => {
      expect(component['formatReportTime'](undefined as any)).toBeUndefined();
    });
  });

  describe('ngOnDestroy with an active resize listener', () => {
    it('should remove the resize listener that onGridReady registered', () => {
      spyOn(window, 'removeEventListener').and.callThrough();
      const mockGridApi = jasmine.createSpyObj('GridApi', ['setGridOption']);
      component.onGridReady({ api: mockGridApi } as any);

      component.ngOnDestroy();

      expect(window.removeEventListener).toHaveBeenCalledWith(
        'resize',
        jasmine.any(Function)
      );
    });
  });

  describe('NoDataOverlay', () => {
    it('should create eGui element containing the "No Records Found" message', () => {
      const overlay = new NoDataOverlay();

      overlay.init({} as any);

      expect(overlay.eGui).toBeTruthy();
      expect(overlay.eGui.innerHTML).toContain('No Records Found');
    });

    it('should return the created eGui element via getGui', () => {
      const overlay = new NoDataOverlay();
      overlay.init({} as any);

      expect(overlay.getGui()).toBe(overlay.eGui);
    });
  });

  describe('updateDataSource edge cases', () => {
    it('should default rowCount and dataSource when payload fields are missing', () => {
      component.updateDataSource({});

      expect(component.rowCount).toBe(0);
      expect(component.dataSource).toEqual([]);
      expect(component.tableData).toEqual([]);
    });

    it('should treat non-object/null version fields as having no status (typeof guard branches)', () => {
      const item: any = {
        bus_num: 'BUS004',
        report_time: '2024-11-04T10:00:00',
        bcv1: 'D1',
        ver1: '1.0', // string, not object
        bcv2: 'D2',
        ver2: undefined,
        bcv3: 'D3',
        ver3: null,
        bcv4: 'D4',
        ver4: { value: '1.0' }, // object but no status
        bcv5: 'D5',
        ver5: 0,
        bcv6: 'D6',
        ver6: 'test',
      };

      component.updateDataSource({
        records_count: 1,
        card_key_version_list: [item],
      });

      expect(component.tableData[0].device_id.status).toBeUndefined();
      expect(component.tableData[0].device_1.id).toBe('D1');
      expect(component.tableData[0].device_1.ver).toBe('1.0');
    });

    it('should push tableData to the grid via setTimeout when gridApi is already set', fakeAsync(() => {
      const mockGridApi = jasmine.createSpyObj('GridApi', ['setGridOption']);
      component.onGridReady({ api: mockGridApi } as any);
      mockGridApi.setGridOption.calls.reset();

      component.updateDataSource({
        records_count: 1,
        card_key_version_list: [
          { bus_num: 'B1', report_time: '2024-01-01T00:00:00' },
        ],
      });
      tick();

      expect(mockGridApi.setGridOption).toHaveBeenCalledWith(
        'rowData',
        component.tableData
      );
    }));
  });

  describe('onSortChanged with no gridApi set', () => {
    it('should return early without updating sort_order or reloading', () => {
      spyOn(component, 'reloadHandler');
      const previousSortOrder = component.params.sort_order;

      expect(() => component.onSortChanged()).not.toThrow();

      expect(component.params.sort_order).toBe(previousSortOrder);
      expect(component.reloadHandler).not.toHaveBeenCalled();
    });
  });

  describe('viewport-dependent defaultColDef.minWidth', () => {
    it('should set minWidth to 100 when window.innerWidth <= 992', () => {
      const originalWidth = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        configurable: true,
      });

      const localFixture = TestBed.createComponent(ViewCardKeyVersionComponent);
      const localComponent = localFixture.componentInstance;

      expect(localComponent.gridOptions.defaultColDef?.minWidth).toBe(100);

      Object.defineProperty(window, 'innerWidth', {
        value: originalWidth,
        configurable: true,
      });
    });

    it('should leave minWidth undefined when window.innerWidth > 992', () => {
      const originalWidth = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', {
        value: 1200,
        configurable: true,
      });

      const localFixture = TestBed.createComponent(ViewCardKeyVersionComponent);
      const localComponent = localFixture.componentInstance;

      expect(localComponent.gridOptions.defaultColDef?.minWidth).toBeUndefined();

      Object.defineProperty(window, 'innerWidth', {
        value: originalWidth,
        configurable: true,
      });
    });

    it('should recompute minWidth to 100 on resize when window.innerWidth <= 992', () => {
      const mockGridApi = jasmine.createSpyObj('GridApi', ['setGridOption']);
      component.onGridReady({ api: mockGridApi } as any);
      mockGridApi.setGridOption.calls.reset();

      const originalWidth = window.innerWidth;
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        configurable: true,
      });
      window.dispatchEvent(new Event('resize'));
      Object.defineProperty(window, 'innerWidth', {
        value: originalWidth,
        configurable: true,
      });

      expect(mockGridApi.setGridOption).toHaveBeenCalledWith(
        'defaultColDef',
        jasmine.objectContaining({ minWidth: 100 })
      );
    });
  });

  describe('colDefs inline valueGetter/cellClass/valueFormatter functions', () => {
    describe('"No." column valueGetter', () => {
      it('should compute the row number from paginationService currentPage/pageSize and node.rowIndex', () => {
        mockPaginationService.currentPage = 2;
        mockPaginationService.pageSize = 10;
        const valueGetter = (component.colDefs[0] as any).children[0]
          .valueGetter;

        const result = valueGetter({ node: { rowIndex: 3 } });

        expect(result).toBe(14);
      });

      it('should default rowIndex to 0 when node.rowIndex is undefined (?? branch)', () => {
        mockPaginationService.currentPage = 1;
        mockPaginationService.pageSize = 10;
        const valueGetter = (component.colDefs[0] as any).children[0]
          .valueGetter;

        const result = valueGetter({ node: {} });

        expect(result).toBe(1);
      });

      it('should default rowIndex to 0 when node itself is undefined (?. branch)', () => {
        mockPaginationService.currentPage = 1;
        mockPaginationService.pageSize = 10;
        const valueGetter = (component.colDefs[0] as any).children[0]
          .valueGetter;

        const result = valueGetter({ node: undefined });

        expect(result).toBe(1);
      });
    });

    describe('"Device ID" column valueGetter/cellClass', () => {
      it('should read the value from device_id.value', () => {
        const valueGetter = (component.colDefs[1] as any).children[0]
          .valueGetter;

        expect(valueGetter({ data: { device_id: { value: 'B1' } } })).toBe(
          'B1'
        );
      });

      it('should return the status for cellClass when present', () => {
        const cellClass = (component.colDefs[1] as any).children[0].cellClass;

        expect(
          cellClass({ data: { device_id: { status: 'failed' } } })
        ).toBe('failed');
      });

      it("should return '' for cellClass when status is falsy", () => {
        const cellClass = (component.colDefs[1] as any).children[0].cellClass;

        expect(
          cellClass({ data: { device_id: { status: undefined } } })
        ).toBe('');
      });
    });

    describe('"Time Of Reporting" column valueFormatter', () => {
      it('should format the date and time into a two-line string', () => {
        const valueFormatter = (component.colDefs[2] as any).children[0]
          .valueFormatter;

        const result = valueFormatter({
          value: { value: '2024-11-01T18:42:59' },
        });

        expect(result).toContain('\n');
        expect(typeof result).toBe('string');
      });
    });

    describe('device_1 .. device_6 column valueGetters and cellClass', () => {
      for (let i = 1; i <= 6; i++) {
        const deviceKey = `device_${i}`;
        const colIndex = i + 2; // colDefs[3]..colDefs[8]

        it(`${deviceKey} id/ver valueGetters should read values from data`, () => {
          const idGetter = (component.colDefs[colIndex] as any).children[0]
            .valueGetter;
          const verGetter = (component.colDefs[colIndex] as any).children[1]
            .valueGetter;
          const data: any = {
            [deviceKey]: { id: 'ID1', ver: 'V1', status: 'inconsistent' },
          };

          expect(idGetter({ data })).toBe('ID1');
          expect(verGetter({ data })).toBe('V1');
        });

        it(`${deviceKey} id/ver cellClass should return the status when present`, () => {
          const idCellClass = (component.colDefs[colIndex] as any).children[0]
            .cellClass;
          const verCellClass = (component.colDefs[colIndex] as any)
            .children[1].cellClass;
          const data: any = { [deviceKey]: { status: 'failed' } };

          expect(idCellClass({ data })).toBe('failed');
          expect(verCellClass({ data })).toBe('failed');
        });

        it(`${deviceKey} id/ver cellClass should return '' when the device entry is missing (optional chaining branch)`, () => {
          const idCellClass = (component.colDefs[colIndex] as any).children[0]
            .cellClass;
          const verCellClass = (component.colDefs[colIndex] as any)
            .children[1].cellClass;
          const data: any = {};

          expect(idCellClass({ data })).toBe('');
          expect(verCellClass({ data })).toBe('');
        });
      }

      it('device_2 id valueGetter should return undefined when device_2 is missing (optional chaining branch)', () => {
        const idGetter = (component.colDefs[4] as any).children[0]
          .valueGetter;

        expect(idGetter({ data: {} })).toBeUndefined();
      });
    });
  });
});
