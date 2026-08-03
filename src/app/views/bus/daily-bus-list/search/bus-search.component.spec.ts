import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { ChangeDetectorRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PayloadResponse } from '@app/models/common';
import { FilterService } from '@app/services/filter.service';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { BusSelectionService } from '@app/services/bus-selection.service';
import DummyData from '@data/db.json';
import { IBustList } from '@models/bus-list';
import { IDepoList } from '@models/depo';
import { DepoService } from '@services/depo.service';
import { ManageDailyBusListService } from '@services/manage-daily-bus-list.service';
import { of, Subject } from 'rxjs';
import { environment } from '@env/environment';
import { BusSearchComponent } from './bus-search.component';
import { PaginationService } from '@app/services/pagination.service';

describe('BusSearchComponent', () => {
  let component: BusSearchComponent;
  let fixture: ComponentFixture<BusSearchComponent>;
  let mockManageDailyBusListService: jasmine.SpyObj<ManageDailyBusListService>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockBusSelectionService: jasmine.SpyObj<BusSelectionService>;

  const mockDepots: IDepoList[] = DummyData.depot_list;
  const mockBusList: IBustList[] = DummyData.daily_bus_list;

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: { daily_bus_list: mockBusList, records_count: mockBusList.length },
  };

  const mockDialogRef = {
    afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(true)),
  };

  const mockDialog = {
    open: jasmine.createSpy('open').and.returnValue(mockDialogRef),
  };

  beforeEach(waitForAsync(() => {
    mockManageDailyBusListService = jasmine.createSpyObj('ManageDailyBusListService', ['search']);
    mockDepoService = jasmine.createSpyObj('DepoService', ['depoList$']);
    mockFilterService = jasmine.createSpyObj('FilterService', [
      'getSelectedFilters', 'updateFormGroup', 'clearSelectedFilters', 'updateSearchValue', 'updateFilterConfigs',
    ]);
    mockPaginationService = jasmine.createSpyObj('PaginationService', [
      'paginatedData$', 'loadData', 'paginateData', 'getTotalPages', 'clearPagination', 'handlePageEvent',
    ]);
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isDagw', 'hasAccess', 'isWebSocketEnabled', 'wsUrl', 'getToken',
    ]);
    mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);
    mockBusSelectionService = jasmine.createSpyObj('BusSelectionService', [
      'clearDailyBusListSelections', 'isDailyBusListSelected', 'toggleDailyBusListSelection',
      'addMultipleDailyBusListSelections', 'removeMultipleDailyBusListSelections',
      'addDailyBusListSelection', 'removeDailyBusListSelection', 'getDailyBusListSelections',
    ]);

    mockDepoService.depoList$ = of(mockDepots);
    mockFilterService.searchValue$ = of('test');
    mockFilterService.filterValues$ = of({ test: ['1'] });
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);
    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.hasAccess.and.returnValue(true);
    mockAuthService.isWebSocketEnabled.and.returnValue(false);
    mockManageDailyBusListService.search.and.returnValue(of(mockPayloadResponse));
    (mockBusSelectionService as any).dailyBusListSelection$ = of([]);
    mockBusSelectionService.isDailyBusListSelected = jasmine.createSpy().and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: ManageDailyBusListService, useValue: mockManageDailyBusListService },
        { provide: DepoService, useValue: mockDepoService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: FilterService, useValue: mockFilterService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: BusSelectionService, useValue: mockBusSelectionService },
        { provide: ChangeDetectorRef, useValue: { markForCheck: () => {}, detectChanges: () => {} } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BusSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load depots and call reloadHandler on initialization', () => {
    expect(component.depots).toEqual(mockDepots);
    expect(mockManageDailyBusListService.search).toHaveBeenCalled();
  });

  it('should load filter values with depotsSec and dayType', () => {
    component.depots = mockDepots;
    component.loadFilterValues();
    expect(component.filterConfigs).toHaveSize(2);
    expect(component.filterConfigs[0].controlName).toBe('depotsSec');
  });

  it('should update dataSource after calling reloadHandler', () => {
    component.reloadHandler();
    expect(component.dataSource).toHaveSize(mockBusList.length);
  });

  it('should call pagination service on page change', () => {
    component.onPageChange({ page: 1, pageSize: 10 });
    expect(mockPaginationService.handlePageEvent).toHaveBeenCalled();
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();
    component.ngOnDestroy();
    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  describe('subscribeToDepoChanges', () => {
    it('falls back to commonService.getDepotIds when depotsSec is absent', () => {
      const search$ = new Subject<string>();
      const filter$ = new Subject<any>();
      const depot$ = new Subject<any>();
      mockFilterService.searchValue$ = search$;
      mockFilterService.filterValues$ = filter$;
      mockDepoService.depoList$ = depot$;
      mockCommonService.getDepotIds.and.returnValue(['9']);

      const freshFixture = TestBed.createComponent(BusSearchComponent);
      const freshComponent = freshFixture.componentInstance;
      freshFixture.detectChanges();

      depot$.next(mockDepots);
      search$.next('abc');
      filter$.next({});

      expect(freshComponent.params.search_select_filter['depot_id_list']).toEqual(['9']);
      freshFixture.destroy();
    });

    it('uses the provided depotsSec array directly when non-empty', () => {
      const search$ = new Subject<string>();
      const filter$ = new Subject<any>();
      const depot$ = new Subject<any>();
      mockFilterService.searchValue$ = search$;
      mockFilterService.filterValues$ = filter$;
      mockDepoService.depoList$ = depot$;

      const freshFixture = TestBed.createComponent(BusSearchComponent);
      const freshComponent = freshFixture.componentInstance;
      freshFixture.detectChanges();

      // The default fixture created in the outer beforeEach already triggered
      // its own subscribeToDepoChanges() (its filterValues$/searchValue$/depoList$
      // mocks are synchronous `of(...)` sources), which called getDepotIds on this
      // same shared spy. Reset so only calls from this test's scenario are counted.
      mockCommonService.getDepotIds.calls.reset();

      depot$.next(mockDepots);
      search$.next('abc');
      filter$.next({ depotsSec: ['3'] });

      expect(freshComponent.params.search_select_filter['depot_id_list']).toEqual(['3']);
      expect(mockCommonService.getDepotIds).not.toHaveBeenCalled();
      freshFixture.destroy();
    });

    it('joins array-valued busId and serviceNo filters into strings', () => {
      const search$ = new Subject<string>();
      const filter$ = new Subject<any>();
      const depot$ = new Subject<any>();
      mockFilterService.searchValue$ = search$;
      mockFilterService.filterValues$ = filter$;
      mockDepoService.depoList$ = depot$;

      const freshFixture = TestBed.createComponent(BusSearchComponent);
      const freshComponent = freshFixture.componentInstance;
      freshFixture.detectChanges();

      depot$.next(mockDepots);
      search$.next('abc');
      filter$.next({ busId: ['S', 'B', 'S'], serviceNo: ['2', '5'] });

      expect(freshComponent.params.search_select_filter['bus_num']).toBe('SBS');
      expect(freshComponent.params.search_select_filter['service_num']).toBe('25');
      freshFixture.destroy();
    });

    it('keeps string-valued busId and serviceNo filters as-is', () => {
      const search$ = new Subject<string>();
      const filter$ = new Subject<any>();
      const depot$ = new Subject<any>();
      mockFilterService.searchValue$ = search$;
      mockFilterService.filterValues$ = filter$;
      mockDepoService.depoList$ = depot$;

      const freshFixture = TestBed.createComponent(BusSearchComponent);
      const freshComponent = freshFixture.componentInstance;
      freshFixture.detectChanges();

      depot$.next(mockDepots);
      search$.next('abc');
      filter$.next({ busId: 'SBS1234', serviceNo: '30' });

      expect(freshComponent.params.search_select_filter['bus_num']).toBe('SBS1234');
      expect(freshComponent.params.search_select_filter['service_num']).toBe('30');
      freshFixture.destroy();
    });
  });

  describe('reloadHandler', () => {
    it('does not call the service when depots is falsy', () => {
      component.depots = undefined as any;
      mockManageDailyBusListService.search.calls.reset();

      component.reloadHandler();

      expect(mockManageDailyBusListService.search).not.toHaveBeenCalled();
    });

    it('does not update dataSource when response status is not 200', () => {
      mockManageDailyBusListService.search.and.returnValue(
        of({ ...mockPayloadResponse, status: 500 })
      );
      component.dataSource = [];

      component.reloadHandler();

      expect(component.dataSource).toEqual([]);
    });
  });

  describe('mapBusList', () => {
    it('falls back to undefined depot_name and day when nothing matches', () => {
      component.depots = [];
      const mapped = component.mapBusList({
        ...mockBusList[0],
        depot_id: 'non-existent',
        day_type: 'non-existent',
      } as any);

      expect(mapped.depot_name).toBeUndefined();
      expect(mapped.day).toBeUndefined();
    });
  });

  describe('checkHandler', () => {
    it('adds the item to the selection service when checked', () => {
      const element = { ...mockBusList[0], chk: false } as any;
      component.checkHandler({ checked: true } as any, element);

      expect(element.chk).toBeTrue();
      expect(mockBusSelectionService.addDailyBusListSelection).toHaveBeenCalledWith(element);
    });

    it('removes the item from the selection service when unchecked', () => {
      const element = { ...mockBusList[0], chk: true } as any;
      component.checkHandler({ checked: false } as any, element);

      expect(element.chk).toBeFalse();
      expect(mockBusSelectionService.removeDailyBusListSelection).toHaveBeenCalledWith(
        element.id
      );
    });
  });

  describe('checkAllHandler', () => {
    it('adds all current page items when checked', () => {
      component.dataSource = [{ ...mockBusList[0], id: 1 }] as any;
      component.checkAllHandler({ checked: true } as any);

      expect(component.chkAll).toBeTrue();
      expect(mockBusSelectionService.addMultipleDailyBusListSelections).toHaveBeenCalled();
    });

    it('removes all current page items when unchecked', () => {
      component.dataSource = [{ ...mockBusList[0], id: 1 }] as any;
      component.checkAllHandler({ checked: false } as any);

      expect(component.chkAll).toBeFalse();
      expect(mockBusSelectionService.removeMultipleDailyBusListSelections).toHaveBeenCalled();
    });
  });

  describe('sortHandler', () => {
    it('sets ascending sort order and reloads', () => {
      spyOn(component, 'reloadHandler');
      component.sortHandler({ active: 'bus_num', direction: 'asc' });
      expect(component.params.sort_order).toEqual([{ name: 'bus_num', desc: false }]);
      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('sets descending sort order for a non-asc direction', () => {
      spyOn(component, 'reloadHandler');
      component.sortHandler({ active: 'bus_num', direction: 'desc' });
      expect(component.params.sort_order).toEqual([{ name: 'bus_num', desc: true }]);
    });
  });

  describe('hiddenHandler', () => {
    it('returns false when the field is not found in headerData', () => {
      expect(component.hiddenHandler('non_existent_field')).toBeFalse();
    });
  });

  describe('openView', () => {
    it('reloads immediately when useDummyData is false', () => {
      spyOn(component, 'reloadHandler');
      const dialogOpenSpy = mockDialog.open as jasmine.Spy;
      dialogOpenSpy.and.returnValue({ afterClosed: () => of(undefined) });
      const original = environment.useDummyData;
      environment.useDummyData = false;

      component.openView();

      expect(component.reloadHandler).toHaveBeenCalled();
      environment.useDummyData = original;
    });

    it('defers reload with a timeout when useDummyData is true', fakeAsync(() => {
      spyOn(component, 'reloadHandler');
      const dialogOpenSpy = mockDialog.open as jasmine.Spy;
      dialogOpenSpy.and.returnValue({ afterClosed: () => of(undefined) });
      const original = environment.useDummyData;
      environment.useDummyData = true;

      component.openView();
      expect(component.reloadHandler).not.toHaveBeenCalled();
      tick(1000);
      expect(component.reloadHandler).toHaveBeenCalled();

      environment.useDummyData = original;
    }));
  });

  describe('updateView', () => {
    it('does nothing further when the dialog is closed via cancel', () => {
      spyOn(component, 'reloadHandler');
      mockBusSelectionService.getDailyBusListSelections.and.returnValue([]);
      const dialogOpenSpy = mockDialog.open as jasmine.Spy;
      dialogOpenSpy.and.returnValue({ afterClosed: () => of('cancel') });

      component.updateView('update');

      expect(component.reloadHandler).not.toHaveBeenCalled();
    });

    it('clears selections and reloads when confirmed', () => {
      spyOn(component, 'reloadHandler');
      mockBusSelectionService.getDailyBusListSelections.and.returnValue([]);
      const dialogOpenSpy = mockDialog.open as jasmine.Spy;
      dialogOpenSpy.and.returnValue({ afterClosed: () => of('delete') });
      const original = environment.useDummyData;
      environment.useDummyData = false;

      component.updateView('delete');

      expect(mockBusSelectionService.clearDailyBusListSelections).toHaveBeenCalled();
      expect(component.reloadHandler).toHaveBeenCalled();
      environment.useDummyData = original;
    });
  });

  describe('onTabChange', () => {
    it('clears filters/selections and reloads', () => {
      spyOn(component, 'reloadHandler');

      component.onTabChange();

      expect(mockFilterService.clearSelectedFilters).toHaveBeenCalled();
      expect(mockBusSelectionService.clearDailyBusListSelections).toHaveBeenCalled();
      expect(component.reloadHandler).toHaveBeenCalled();
    });
  });

  describe('onPageChange', () => {
    it('updates currentPage before delegating to the pagination service', () => {
      component.onPageChange({ page: 3, pageSize: 20 });

      expect(component.currentPage).toBe(3);
      expect(mockPaginationService.handlePageEvent).toHaveBeenCalled();
    });
  });
});
