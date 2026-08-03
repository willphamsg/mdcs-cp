import { Component } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';

import {
  IActionHistoryParams,
  IHeader,
  IParams,
  PayloadResponse,
} from '@models/common';
import { IDepoList } from '@models/depo';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { ParameterSelectionService } from '@app/services/parameter-selection.service';
import { ParameterService } from '@app/services/parameter.service';
import { PaginationService } from '@app/services/pagination.service';
import { WebSocketService } from '@app/services/web-socket.service';

import {
  IParameterTrialSearchItem,
  ParameterTrialSearchBase,
} from './parameter-trial-search.base';

interface ITestItem extends IParameterTrialSearchItem {
  status_desc?: string;
}

/**
 * Minimal concrete subclass exercising the shared base-class logic in
 * isolation, independent of any real search page. Selection bookkeeping is
 * implemented with a plain in-memory array/subject instead of calling out to
 * a page-specific selection service, since the exact method names differ per
 * concrete page (addEndTrialSelection, addParameterModeSelection, ...).
 */
@Component({
  selector: 'app-test-parameter-trial-search',
  template: '',
})
class TestParameterTrialSearchComponent extends ParameterTrialSearchBase<ITestItem> {
  protected readonly viewDialogComponent = class {};
  protected readonly listPayloadKey = 'test_list';
  protected readonly errorItemLabel = 'test item';
  protected readonly errorSnackbarTitle = 'Test Error';
  protected readonly defaultStatus = [1];
  protected readonly inProgressStatusCodes = new Set(['IN_PROGRESS']);

  headerData: IHeader[] = [
    { chk: true, field: 'name', name: 'Name', hidden: false },
    { chk: true, field: 'status', name: 'Status', hidden: false },
  ];

  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: { status: [1] },
  };

  actionHistoryParams: IActionHistoryParams = {
    search_select_filter: { status: [1] },
    search_text: '',
    sort_order: [],
  };

  errorCheckParams: IActionHistoryParams = {
    search_select_filter: {},
  };

  testSelections: ITestItem[] = [];
  private readonly testSelection$ = new BehaviorSubject<ITestItem[]>([]);

  protected getSelectionObservable(): Observable<ITestItem[]> {
    return this.testSelection$.asObservable();
  }
  protected addSelection(item: ITestItem): void {
    this.testSelections = [...this.testSelections, item];
    this.testSelection$.next(this.testSelections);
  }
  protected removeSelection(id: string | number): void {
    this.testSelections = this.testSelections.filter(i => i.id !== id);
    this.testSelection$.next(this.testSelections);
  }
  protected isSelected(id: string | number): boolean {
    return this.testSelections.some(i => i.id === id);
  }
  protected getSelections(): ITestItem[] {
    return this.testSelections;
  }
  protected clearSelections(): void {
    this.testSelections = [];
    this.testSelection$.next(this.testSelections);
  }
  protected addMultipleSelections(items: ITestItem[]): void {
    this.testSelections = [...this.testSelections, ...items];
    this.testSelection$.next(this.testSelections);
  }
  protected removeMultipleSelections(ids: string[]): void {
    this.testSelections = this.testSelections.filter(
      i => !ids.includes(String(i.id))
    );
    this.testSelection$.next(this.testSelections);
  }
  protected searchActionErrors(
    params: IActionHistoryParams
  ): Observable<PayloadResponse> {
    return this.parameterService.searchEndTrialErrors(params);
  }
  protected getUpdateViewTitle(action: string): string {
    return action === 'approve' ? 'Approve' : '';
  }
  updateView(action: string): void {
    const items = this.getSelections();
    const ids = this.extractParamMasterIds(items);
    this.openParameterTrialDialog(action, items, ids, ['approve'], ['cancel']);
  }
}

describe('ParameterTrialSearchBase (via a minimal concrete test subclass)', () => {
  let component: TestParameterTrialSearchComponent;
  let fixture: ComponentFixture<TestParameterTrialSearchComponent>;

  let mockParameterService: jasmine.SpyObj<ParameterService>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;
  let mockDialog: { open: jasmine.Spy };
  let mockDialogRef: { afterClosed: jasmine.Spy };

  let depoSearchSubject: Subject<any>;
  let searchValueSubject: Subject<string>;
  let filterValuesSubject: Subject<any>;

  const mockDepots: IDepoList[] = [
    { depot_id: 1, depot_name: 'Depot A', depot_code: 'DA', version: 1 } as any,
    { depot_id: 2, depot_name: 'Depot B', depot_code: 'DB', version: 1 } as any,
    { depot_id: 999, depot_name: 'System', depot_code: 'SYS', version: 1 } as any,
  ];

  const okResponse = (payload: any): PayloadResponse => ({
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'ok',
    payload,
  });

  beforeEach(() => {
    mockParameterService = jasmine.createSpyObj('ParameterService', [
      'search',
      'searchHistory',
      'getTrialSchedulerRateSeconds',
      'searchEndTrialErrors',
    ]);
    mockDepoService = jasmine.createSpyObj('DepoService', ['search']);
    mockFilterService = jasmine.createSpyObj('FilterService', [
      'clearSelectedFilters',
      'updateFilterConfigs',
    ]);
    mockPaginationService = jasmine.createSpyObj('PaginationService', [
      'handlePageEvent',
    ]);
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider']);
    mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);
    mockWebSocketService = jasmine.createSpyObj('WebSocketService', [
      'refreshTrigger',
    ]);
    mockWebSocketService.refreshTrigger.and.returnValue(new Subject());

    mockDialogRef = { afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(undefined)) };
    mockDialog = { open: jasmine.createSpy('open').and.returnValue(mockDialogRef) };

    depoSearchSubject = new Subject();
    searchValueSubject = new Subject<string>();
    filterValuesSubject = new Subject<any>();

    mockDepoService.search.and.returnValue(depoSearchSubject as any);
    mockFilterService.searchValue$ = searchValueSubject.asObservable();
    mockFilterService.filterValues$ = filterValuesSubject.asObservable();

    mockAuthService.getSVCProvider.and.returnValue('7');
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);
    mockParameterService.getTrialSchedulerRateSeconds.and.returnValue(
      of(okResponse({ rateSeconds: 60 }))
    );
    mockParameterService.search.and.returnValue(
      of(okResponse({ records_count: 0, test_list: [] }))
    );
    mockParameterService.searchHistory.and.returnValue(
      of(okResponse({ records_count: 0, test_list: [] }))
    );
    mockParameterService.searchEndTrialErrors.and.returnValue(
      of(okResponse({ test_list: [] }))
    );

    TestBed.configureTestingModule({
      providers: [
        { provide: ParameterService, useValue: mockParameterService },
        { provide: DepoService, useValue: mockDepoService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: FilterService, useValue: mockFilterService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: ParameterSelectionService, useValue: {} },
        { provide: Store, useValue: mockStore },
        { provide: WebSocketService, useValue: mockWebSocketService },
      ],
    });

    fixture = TestBed.createComponent(TestParameterTrialSearchComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create and read svc-prov id from AuthService', () => {
    expect(component).toBeTruthy();
    expect(component.svcProviderID).toBe('7');
  });

  describe('ngOnInit', () => {
    it('should merge svc_prov_id into params and subscribe to selections', () => {
      fixture.detectChanges();

      expect(component.params.search_select_filter?.['svc_prov_id']).toEqual([7]);

      component['addSelection']({ id: 1, chk: false, depot_id: 1, depot_name: 'A' });
      expect(component.selection).toHaveSize(1);
    });
  });

  describe('callTrialSchedulerRateSeconds', () => {
    it('should set the rate (plus buffer) on a 200 response', () => {
      component.callTrialSchedulerRateSeconds();
      expect(component['trialSchedulerRateSeconds']).toBe(90);
    });

    it('should fall back to 0 when rateSeconds is missing (NaN || 0)', () => {
      mockParameterService.getTrialSchedulerRateSeconds.and.returnValue(
        of(okResponse({}))
      );
      component.callTrialSchedulerRateSeconds();
      expect(component['trialSchedulerRateSeconds']).toBe(0);
    });

    it('should leave the rate unset when the response status is not 200', () => {
      mockParameterService.getTrialSchedulerRateSeconds.and.returnValue(
        of({ ...okResponse({ rateSeconds: 999 }), status: 500 })
      );
      component.callTrialSchedulerRateSeconds();
      expect(component['trialSchedulerRateSeconds']).toBe(0);
    });

    it('should not throw when the request errors', () => {
      spyOn(console, 'error');
      mockParameterService.getTrialSchedulerRateSeconds.and.returnValue(
        new Observable<PayloadResponse>(subscriber => subscriber.error('boom'))
      );
      expect(() => component.callTrialSchedulerRateSeconds()).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('subscribeToDepoChanges', () => {
    beforeEach(() => {
      fixture.detectChanges(); // triggers ngOnInit -> subscribeToDepoChanges
    });

    it('should skip updates while a tab change is in progress', fakeAsync(() => {
      component['isTabChanging'] = true;
      const reloadSpy = spyOn(component, 'reloadHandler');

      depoSearchSubject.next({ payload: { depot_info: mockDepots } });
      searchValueSubject.next('abc');
      filterValuesSubject.next({});
      tick(150);

      expect(reloadSpy).not.toHaveBeenCalled();
      expect(component.depots).toHaveSize(0);
    }));

    it('should filter out depot 999, load filter values only on the first non-empty load, and reload', fakeAsync(() => {
      const reloadSpy = spyOn(component, 'reloadHandler');

      depoSearchSubject.next({ payload: { depot_info: mockDepots } });
      searchValueSubject.next('bus-1');
      filterValuesSubject.next({});
      tick(150);

      expect(component.depots).toHaveSize(2);
      expect(component.depots.some(d => (d as any).depot_id === 999)).toBeFalse();
      expect(mockFilterService.updateFilterConfigs).toHaveBeenCalledTimes(1);
      expect(component.params.search_text).toBe('bus-1');
      expect(reloadSpy).toHaveBeenCalled();

      // Second emission with depots already loaded should not reload filter configs again.
      depoSearchSubject.next({ payload: { depot_info: mockDepots } });
      searchValueSubject.next('bus-2');
      filterValuesSubject.next({});
      tick(150);

      expect(mockFilterService.updateFilterConfigs).toHaveBeenCalledTimes(1);
    }));

    it('should default to defaultStatus when no status filter is provided, and only touch actionHistoryParams on tab 1', fakeAsync(() => {
      component.tabIdx = 1;

      depoSearchSubject.next({ payload: { depot_info: mockDepots } });
      searchValueSubject.next('');
      filterValuesSubject.next({});
      tick(150);

      expect(component.params.search_select_filter?.['status']).toEqual([1]);
      expect(component.actionHistoryParams.search_select_filter['status']).toEqual([1]);
    }));
  });

  describe('loadFilterValues', () => {
    it('should build filter configs from the current depots and push them to FilterService', () => {
      component.depots = mockDepots.slice(0, 2);
      component.loadFilterValues();

      expect(component.filterConfigs).toHaveSize(2);
      expect(mockFilterService.updateFilterConfigs).toHaveBeenCalledWith(
        component.filterConfigs
      );
    });
  });

  describe('initDefaultMonth', () => {
    it('should return the first and last instant of the current month', () => {
      const range = component['initDefaultMonth']();
      expect(range.effective_date_from).toMatch(/^\d{4}-\d{2}-01 00:00:00$/);
      expect(range.effective_date_till).toMatch(/^\d{4}-\d{2}-\d{2} 23:59:59$/);
    });
  });

  describe('onMonthFilterChange', () => {
    it('should update actionHistoryParams and reload only when on the History tab', () => {
      const reloadSpy = spyOn(component, 'reloadHandler');
      component.tabIdx = 0;

      component.onMonthFilterChange({
        effective_date_from: '2024-01-01 00:00:00',
        effective_date_till: '2024-01-31 23:59:59',
      });

      expect(
        component.actionHistoryParams.search_select_filter['last_updated_start']
      ).toBe('2024-01-01 00:00:00');
      expect(reloadSpy).not.toHaveBeenCalled();

      component.tabIdx = 1;
      component.onMonthFilterChange({
        effective_date_from: '2024-02-01 00:00:00',
        effective_date_till: '2024-02-29 23:59:59',
      });
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('onTabChange', () => {
    it('should switch to the History tab, seed the month range, and reload', fakeAsync(() => {
      const reloadSpy = spyOn(component, 'reloadHandler');
      component.tabIdx = 0;

      component.onTabChange({ index: 1 });

      expect(component.tabIdx).toBe(1);
      expect(mockFilterService.clearSelectedFilters).toHaveBeenCalled();
      expect(component.actionHistoryParams.sort_order).toEqual([
        { name: 'last_update', desc: true },
      ]);
      expect(reloadSpy).toHaveBeenCalled();
      expect(component['isTabChanging']).toBeTrue();

      tick(150);
      expect(component['isTabChanging']).toBeFalse();
    }));

    it('should reset the Action Required tab status filter when switching to tab 0', fakeAsync(() => {
      spyOn(component, 'reloadHandler');
      component.onTabChange({ index: 0 });
      expect(component.params.search_select_filter?.['status']).toEqual([1]);
      tick(150);
    }));

    it('should keep the current tabIdx when no event is provided', fakeAsync(() => {
      spyOn(component, 'reloadHandler');
      component.tabIdx = 1;
      component.onTabChange();
      expect(component.tabIdx).toBe(1);
      tick(150);
    }));
  });

  describe('reloadHandler', () => {
    it('should call search on tab 0 and populate the data source on success', () => {
      mockParameterService.search.and.returnValue(
        of(
          okResponse({
            records_count: 1,
            test_list: [{ depot_id: 1, param_master_id: 5 }],
          })
        )
      );

      component.tabIdx = 0;
      component.reloadHandler();

      expect(mockParameterService.search).toHaveBeenCalled();
      expect(component.dataSource).toHaveSize(1);
      expect(component.rowCount).toBe(1);
    });

    it('should call searchHistory on tab 1', () => {
      component.tabIdx = 1;
      component.reloadHandler();
      expect(mockParameterService.searchHistory).toHaveBeenCalled();
    });

    it('should reset the data source when the response status is not 200', () => {
      component.dataSource = [{ id: 1, chk: false, depot_id: 1, depot_name: 'A' }];
      mockParameterService.search.and.returnValue(
        of({ ...okResponse({}), status: 500 })
      );

      component.tabIdx = 0;
      component.reloadHandler();

      expect(component.dataSource).toEqual([]);
      expect(component.rowCount).toBe(0);
      expect(component.chkAll).toBeFalse();
    });

    it('should reset the data source and log when the request errors', () => {
      spyOn(console, 'error');
      component.dataSource = [{ id: 1, chk: false, depot_id: 1, depot_name: 'A' }];
      mockParameterService.search.and.returnValue(
        new Observable<PayloadResponse>(subscriber => subscriber.error('network down'))
      );

      component.tabIdx = 0;
      component.reloadHandler();

      expect(component.dataSource).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('mapDataSource', () => {
    it('should resolve the depot name from the loaded depot list', () => {
      component.depots = mockDepots;
      const mapped = component.mapDataSource({ depot_id: 1, param_master_id: 5 });
      expect(mapped.depot_name).toBe('Depot A');
      expect(mapped.id).toBe('5_1');
    });

    it('should label depot_id "0" as "All Depot"', () => {
      component.depots = mockDepots;
      const mapped = component.mapDataSource({ depot_id: 0, param_master_id: 5 });
      expect(mapped.depot_name).toBe('All Depot');
    });

    it('should leave depot_name undefined when the depot cannot be found', () => {
      component.depots = mockDepots;
      const mapped = component.mapDataSource({ depot_id: 42, param_master_id: 5 });
      expect(mapped.depot_name).toBeUndefined();
    });

    it('should fall back to a generated numeric id when param_master_id/depot_id are missing', () => {
      component.depots = mockDepots;
      const mapped = component.mapDataSource({ depot_id: 0, param_master_id: undefined });
      expect(typeof mapped.id).toBe('number');
    });
  });

  describe('checkHandler / checkAllHandler / updateCheckAllState', () => {
    beforeEach(() => {
      component.dataSource = [
        { id: 1, chk: false, depot_id: 1, depot_name: 'A' },
        { id: 2, chk: false, depot_id: 1, depot_name: 'A' },
      ];
    });

    it('should add the item to the selection and flip chkAll once every row is selected', () => {
      component.checkHandler({ checked: true } as MatCheckboxChange, component.dataSource[0]);
      expect(component.dataSource[0].chk).toBeTrue();
      expect(component.chkAll).toBeFalse();

      component.checkHandler({ checked: true } as MatCheckboxChange, component.dataSource[1]);
      expect(component.chkAll).toBeTrue();
    });

    it('should remove the item from the selection when unchecked', () => {
      component.checkHandler({ checked: true } as MatCheckboxChange, component.dataSource[0]);
      component.checkHandler({ checked: false } as MatCheckboxChange, component.dataSource[0]);
      expect(component.dataSource[0].chk).toBeFalse();
      expect(component['isSelected'](1)).toBeFalse();
    });

    it('checkAllHandler(true) should select every row on the page', () => {
      component.checkAllHandler({ checked: true } as MatCheckboxChange);
      expect(component.dataSource.every(i => i.chk)).toBeTrue();
      expect(component.testSelections).toHaveSize(2);
    });

    it('checkAllHandler(false) should clear every row on the page', () => {
      component.checkAllHandler({ checked: true } as MatCheckboxChange);
      component.checkAllHandler({ checked: false } as MatCheckboxChange);
      expect(component.dataSource.every(i => !i.chk)).toBeTrue();
      expect(component.testSelections).toHaveSize(0);
    });

    it('chkAll should stay false when there is no data', () => {
      component.dataSource = [];
      component.checkAllHandler({ checked: false } as MatCheckboxChange);
      expect(component.chkAll).toBeFalse();
    });
  });

  describe('sortHandler', () => {
    it('should set an ascending sort on params for tab 0', () => {
      component.tabIdx = 0;
      component.sortHandler({ active: 'name', direction: 'asc' } as any);
      expect(component.params.sort_order).toEqual([{ name: 'name', desc: false }]);
    });

    it('should treat a non-"asc" direction as descending on tab 0', () => {
      component.tabIdx = 0;
      component.sortHandler({ active: 'name', direction: 'desc' } as any);
      expect(component.params.sort_order).toEqual([{ name: 'name', desc: true }]);
    });

    it('should set sort on actionHistoryParams for tab 1', () => {
      component.tabIdx = 1;
      component.sortHandler({ active: 'status', direction: 'asc' } as any);
      expect(component.actionHistoryParams.sort_order).toEqual([
        { name: 'status', desc: false },
      ]);
    });

    it('should still reload without touching either sort_order for an unknown tab', () => {
      component.tabIdx = 2;
      const reloadSpy = spyOn(component, 'reloadHandler');
      const before = [...component.params.sort_order];
      component.sortHandler({ active: 'name', direction: 'asc' } as any);
      expect(component.params.sort_order).toEqual(before as any);
      expect(reloadSpy).toHaveBeenCalled();
    });
  });

  describe('headerHandler / hiddenHandler', () => {
    it('should toggle the chk flag for the matching header and read it back', () => {
      component.headerHandler({ checked: true } as MatCheckboxChange, { field: 'status' } as any);
      expect(component.hiddenHandler('status')).toBeTrue();

      component.headerHandler({ checked: false } as MatCheckboxChange, { field: 'status' } as any);
      expect(component.hiddenHandler('status')).toBeFalse();
    });
  });

  describe('onPageChange', () => {
    it('should update currentPage and delegate to PaginationService', () => {
      component.onPageChange({ page: 3, pageSize: 20 });
      expect(component.currentPage).toBe(3);
      expect(mockPaginationService.handlePageEvent).toHaveBeenCalledWith(
        component.params,
        { page: 3, pageSize: 20 },
        jasmine.any(Function)
      );
    });
  });

  describe('extractParamMasterIds', () => {
    it('should dedupe and drop non-numeric ids', () => {
      const ids = component['extractParamMasterIds']([
        { id: 1, chk: false, depot_id: 1, depot_name: 'A', param_master_id: 5 },
        { id: 2, chk: false, depot_id: 1, depot_name: 'A', param_master_id: 5 },
        { id: 3, chk: false, depot_id: 1, depot_name: 'A', param_master_id: undefined },
      ]);
      expect(ids).toEqual([5]);
    });
  });

  describe('openParameterTrialDialog / updateView', () => {
    it('should open the dialog with the expected data', () => {
      component.testSelections = [{ id: 1, chk: true, depot_id: 1, depot_name: 'A', param_master_id: 5 }];
      component.updateView('approve');

      expect(mockDialog.open).toHaveBeenCalled();
      const args = mockDialog.open.calls.mostRecent().args[1];
      expect(args.data.title).toBe('Approve Selected');
      expect(args.data.action).toBe('approve');
    });

    it('should switch to History tab and start the refresh cycle when the result is not excluded', () => {
      mockDialogRef.afterClosed.and.returnValue(of('confirmed'));
      component.testSelections = [{ id: 1, chk: true, depot_id: 1, depot_name: 'A', param_master_id: 5 }];
      const startCycleSpy = spyOn<any>(component, 'startStatusRefreshCycle');
      const reloadSpy = spyOn(component, 'reloadHandler');

      component.updateView('approve');

      expect(component.tabIdx).toBe(1);
      expect(reloadSpy).toHaveBeenCalled();
      expect(startCycleSpy).toHaveBeenCalledWith([5]);
    });

    it('should not switch tabs when the dialog result is excluded ("cancel")', () => {
      mockDialogRef.afterClosed.and.returnValue(of('cancel'));
      const startCycleSpy = spyOn<any>(component, 'startStatusRefreshCycle');
      component.tabIdx = 0;

      component.updateView('approve');

      expect(component.tabIdx).toBe(0);
      expect(startCycleSpy).not.toHaveBeenCalled();
    });

    it('should not switch tabs when the action is not a refresh-trigger action', () => {
      mockDialogRef.afterClosed.and.returnValue(of('confirmed'));
      const startCycleSpy = spyOn<any>(component, 'startStatusRefreshCycle');
      component.tabIdx = 0;

      component.updateView('reject');

      expect(component.tabIdx).toBe(0);
      expect(startCycleSpy).not.toHaveBeenCalled();
    });
  });

  describe('startStatusRefreshCycle / stopStatusRefreshCycle', () => {
    it('should delegate to the shared statusRefresh helper with the current scheduler rate', () => {
      const startSpy = spyOn(component['statusRefresh'], 'start');
      component['trialSchedulerRateSeconds'] = 42;

      component['startStatusRefreshCycle']([1, 2]);

      expect(startSpy).toHaveBeenCalledWith([1, 2], 42, jasmine.any(Function));
    });

    it('should delegate stop() with the trigger flag', () => {
      const stopSpy = spyOn(component['statusRefresh'], 'stop');
      component['stopStatusRefreshCycle'](true);
      expect(stopSpy).toHaveBeenCalledWith(true);
    });
  });

  describe('refreshActionHistoryForPendingIds (private, invoked via statusRefresh onTick)', () => {
    it('should do nothing when there are no pending ids', () => {
      (component['statusRefresh'] as any).pendingIds = [];
      component['refreshActionHistoryForPendingIds']();
      expect(mockParameterService.searchHistory).not.toHaveBeenCalled();
    });

    it('should do nothing when the component has been destroyed', () => {
      (component['statusRefresh'] as any).pendingIds = [1];
      component['isDestroyed'] = true;
      component['refreshActionHistoryForPendingIds']();
      expect(mockParameterService.searchHistory).not.toHaveBeenCalled();
    });

    it('should refresh the data source when on the History tab', () => {
      (component['statusRefresh'] as any).pendingIds = [1];
      component.tabIdx = 1;
      mockParameterService.searchHistory.and.returnValue(
        of(okResponse({ records_count: 1, test_list: [{ depot_id: 1, param_master_id: 1 }] }))
      );

      component['refreshActionHistoryForPendingIds']();

      expect(component.dataSource).toHaveSize(1);
    });

    it('should not touch the data source when not on the History tab even on success', () => {
      (component['statusRefresh'] as any).pendingIds = [1];
      component.tabIdx = 0;
      component.dataSource = [];
      mockParameterService.searchHistory.and.returnValue(
        of(okResponse({ records_count: 1, test_list: [{ depot_id: 1, param_master_id: 1 }] }))
      );

      component['refreshActionHistoryForPendingIds']();

      expect(component.dataSource).toHaveSize(0);
    });

    it('should log and not throw when the refresh errors', () => {
      spyOn(console, 'error');
      (component['statusRefresh'] as any).pendingIds = [1];
      component.tabIdx = 1;
      mockParameterService.searchHistory.and.returnValue(
        new Observable<PayloadResponse>(subscriber => subscriber.error('boom'))
      );

      expect(() => component['refreshActionHistoryForPendingIds']()).not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('triggerErrorCheck (private, invoked via statusRefresh onComplete)', () => {
    it('should dispatch a snackbar action when errors are found', () => {
      mockParameterService.searchEndTrialErrors.and.returnValue(
        of(okResponse({ test_list: [{ id: 1 }] }))
      );

      component['triggerErrorCheck']([1, 2]);

      expect(mockStore.dispatch).toHaveBeenCalled();
      expect(mockParameterService.search).toHaveBeenCalled(); // finalize -> refreshActionRequiredAndHistory
      expect(mockParameterService.searchHistory).toHaveBeenCalled();
    });

    it('should not dispatch when there are no errors', () => {
      mockParameterService.searchEndTrialErrors.and.returnValue(
        of(okResponse({ test_list: [] }))
      );

      component['triggerErrorCheck']([1]);

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should not dispatch when the response status is not 200', () => {
      mockParameterService.searchEndTrialErrors.and.returnValue(
        of({ ...okResponse({ test_list: [{ id: 1 }] }), status: 500 })
      );

      component['triggerErrorCheck']([1]);

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should still refresh (via finalize) and log when the error-check request errors', () => {
      spyOn(console, 'error');
      mockParameterService.searchEndTrialErrors.and.returnValue(
        new Observable<PayloadResponse>(subscriber => subscriber.error('boom'))
      );

      component['triggerErrorCheck']([1]);

      expect(console.error).toHaveBeenCalled();
      expect(mockParameterService.search).toHaveBeenCalled();
    });
  });

  describe('isInProgressStatus', () => {
    it('should return false for a null/undefined status', () => {
      expect(component.isInProgressStatus(undefined)).toBeFalse();
      expect(component.isInProgressStatus(null)).toBeFalse();
    });

    it('should return true for a matching status regardless of case', () => {
      expect(component.isInProgressStatus('in_progress')).toBeTrue();
    });

    it('should return false for a non-matching status', () => {
      expect(component.isInProgressStatus('DONE')).toBeFalse();
    });
  });

  describe('ngOnDestroy', () => {
    it('should mark the component destroyed, stop the refresh cycle, and clear selections', () => {
      const stopSpy = spyOn<any>(component, 'stopStatusRefreshCycle');
      component.testSelections = [{ id: 1, chk: true, depot_id: 1, depot_name: 'A' }];

      component.ngOnDestroy();

      expect(component['isDestroyed']).toBeTrue();
      expect(stopSpy).toHaveBeenCalled();
      expect(component.testSelections).toHaveSize(0);
    });
  });
});
