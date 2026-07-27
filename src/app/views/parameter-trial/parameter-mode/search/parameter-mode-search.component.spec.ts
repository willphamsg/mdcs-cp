import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { ParameterService } from '@app/services/parameter.service';
import { ParameterSelectionService } from '@app/services/parameter-selection.service';
import { WebSocketService } from '@app/services/web-socket.service';
import { Store } from '@ngrx/store';
import { of, Subject } from 'rxjs';
import { ParameterModeSearchComponent } from './parameter-mode-search.component';

describe('ParameterModeSearchComponent', () => {
  let component: ParameterModeSearchComponent;
  let fixture: ComponentFixture<ParameterModeSearchComponent>;
  let mockParameterService: jasmine.SpyObj<ParameterService>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockSelectionService: jasmine.SpyObj<ParameterSelectionService>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;
  let refreshTriggerSubject: Subject<unknown>;

  const mockDepots: IDepoList[] = [
    { depot_id: 1, depot_name: 'Depot A', depot_code: 'DA', version: 1 } as any,
    { depot_id: 2, depot_name: 'Depot B', depot_code: 'DB', version: 1 } as any,
  ];

  const mockParameterModeList: any[] = [
    {
      id: 1,
      version: 1,
      depot_id: 1,
      depot_name: 'Depot A',
      parameter_name: 'Param1',
      parameter_version: 'v1',
      status_code: 0,
      chk: false,
    },
  ];

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: { parameter_mode_list: mockParameterModeList, records_count: 1 },
  };

  const mockDialogRef = {
    afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of()),
  };

  const mockDialog = {
    open: jasmine.createSpy('open').and.returnValue(mockDialogRef),
  };

  beforeEach(waitForAsync(() => {
    mockParameterService = jasmine.createSpyObj('ParameterService', [
      'search',
      'searchHistory',
      'getTrialSchedulerRateSeconds',
      'searchParameterModeErrors',
    ]);
    mockDepoService = jasmine.createSpyObj('DepoService', [
      'depoList$',
      'search',
    ]);
    mockFilterService = jasmine.createSpyObj('FilterService', [
      'getSelectedFilters',
      'updateFormGroup',
      'clearSelectedFilters',
      'updateSearchValue',
      'updateFilterConfigs',
    ]);
    mockPaginationService = jasmine.createSpyObj('PaginationService', [
      'handlePageEvent', 'clearPagination', 'getTotalPages',
    ]);
    mockPaginationService.getTotalPages.and.returnValue(0);
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'getServiceProviderId',
      'getSVCProvider',
      'isDagw',
      'hasAccess',
    ]);
    mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);
    mockSelectionService = jasmine.createSpyObj('ParameterSelectionService', [
      'clearParameterModeSelections',
      'isParameterModeSelected',
      'toggleParameterModeSelection',
      'addParameterModeSelection',
      'removeParameterModeSelection',
      'addMultipleParameterModeSelections',
      'removeMultipleParameterModeSelections',
      'getParameterModeSelections',
    ]);
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);
    refreshTriggerSubject = new Subject<unknown>();
    mockWebSocketService = jasmine.createSpyObj('WebSocketService', [
      'refreshTrigger',
    ]);
    mockWebSocketService.refreshTrigger.and.returnValue(refreshTriggerSubject);

    mockDepoService.depoList$ = of(mockDepots);
    mockDepoService.search = jasmine.createSpy().and.returnValue(
      of({
        payload: {
          depot_info: mockDepots.map(d => ({
            ...d,
            depot_name: d.depot_name,
          })),
        },
      })
    );
    mockFilterService.searchValue$ = of('');
    mockFilterService.filterValues$ = of({});
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);
    mockAuthService.getSVCProvider.and.returnValue('1');
    mockAuthService.hasAccess.and.returnValue(true);
    mockParameterService.search.and.returnValue(of(mockPayloadResponse));
    mockParameterService.searchHistory.and.returnValue(
      of(mockPayloadResponse)
    );
    mockParameterService.getTrialSchedulerRateSeconds.and.returnValue(
      of({ status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: '', payload: { rateSeconds: 60 } })
    );
    mockParameterService.searchParameterModeErrors.and.returnValue(
      of(mockPayloadResponse)
    );
    mockSelectionService.parameterModeSelection$ = of([]);
    mockSelectionService.isParameterModeSelected.and.returnValue(false);
    mockSelectionService.getParameterModeSelections.and.returnValue([]);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: ParameterService, useValue: mockParameterService },
        { provide: DepoService, useValue: mockDepoService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: FilterService, useValue: mockFilterService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: ParameterSelectionService, useValue: mockSelectionService },
        { provide: Store, useValue: mockStore },
        { provide: WebSocketService, useValue: mockWebSocketService },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParameterModeSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call subscribeToDepoChanges on init', () => {
    spyOn(component, 'subscribeToDepoChanges').and.callThrough();
    component.ngOnInit();
    expect(component.subscribeToDepoChanges).toHaveBeenCalled();
  });

  it('should load filter values with depot list', () => {
    component.depots = mockDepots;
    component.loadFilterValues();

    expect(component.filterConfigs).toHaveSize(2);
    expect(component.filterConfigs[0].controlName).toBe('depots');
    expect(component.filterConfigs[0].options).toEqual(mockDepots);
  });

  it('should call clearSelectedFilters on tabChange', () => {
    component.onTabChange();
    expect(mockFilterService.clearSelectedFilters).toHaveBeenCalled();
  });

  it('should open dialog when updateView is called', () => {
    const action = 'test';
    mockSelectionService.getParameterModeSelections.and.returnValue([
      { param_master_id: 1, depot_id: 1, depot_name: 'Depot A', param_file_name: 'file', param_payload_version: 'v1', chk: false } as any,
    ]);
    component.updateView(action);
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  describe('checkHandler', () => {
    it('adds the row to the selection service when checked', () => {
      const element = { id: 1, chk: false } as any;

      component.checkHandler({ checked: true } as MatCheckboxChange, element);

      expect(element.chk).toBeTrue();
      expect(mockSelectionService.addParameterModeSelection).toHaveBeenCalledWith(
        element
      );
      expect(
        mockSelectionService.removeParameterModeSelection
      ).not.toHaveBeenCalled();
    });

    it('removes the row from the selection service when unchecked', () => {
      const element = { id: 1, chk: true } as any;

      component.checkHandler({ checked: false } as MatCheckboxChange, element);

      expect(element.chk).toBeFalse();
      expect(
        mockSelectionService.removeParameterModeSelection
      ).toHaveBeenCalledWith(1);
      expect(
        mockSelectionService.addParameterModeSelection
      ).not.toHaveBeenCalled();
    });
  });

  describe('headerHandler', () => {
    it('updates the chk flag of the matching header column', () => {
      const field = component.headerData[0].field;

      component.headerHandler(
        { checked: true } as MatCheckboxChange,
        { field } as any
      );

      expect(component.headerData.find(x => x.field === field)!.chk).toBeTrue();

      component.headerHandler(
        { checked: false } as MatCheckboxChange,
        { field } as any
      );

      expect(component.headerData.find(x => x.field === field)!.chk).toBeFalse();
    });
  });

  describe('status refresh cycle', () => {
    it('does not start the refresh cycle when there are no ids to track', () => {
      mockWebSocketService.refreshTrigger.calls.reset();

      component['startStatusRefreshCycle']([]);

      expect(mockWebSocketService.refreshTrigger).not.toHaveBeenCalled();
    });

    it('starts the refresh cycle and reacts to websocket ticks via the onTick callback', () => {
      component['startStatusRefreshCycle']([1, 2]);

      expect(mockWebSocketService.refreshTrigger).toHaveBeenCalled();

      mockParameterService.searchHistory.calls.reset();
      refreshTriggerSubject.next(null);

      expect(mockParameterService.searchHistory).toHaveBeenCalled();
    });

    it('does not start the refresh cycle when the component has been destroyed', () => {
      component['isDestroyed'] = true;
      mockWebSocketService.refreshTrigger.calls.reset();

      component['startStatusRefreshCycle']([7, 8]);

      expect(mockWebSocketService.refreshTrigger).not.toHaveBeenCalled();
    });

    it('skips refreshing action history when there are no pending ids (guard)', () => {
      mockParameterService.searchHistory.calls.reset();

      component['refreshActionHistoryForPendingIds']();

      expect(mockParameterService.searchHistory).not.toHaveBeenCalled();
    });

    it('refreshes action history when pending ids are present (guard, populated branch)', () => {
      component['startStatusRefreshCycle']([1, 2]);
      mockParameterService.searchHistory.calls.reset();

      component['refreshActionHistoryForPendingIds']();

      expect(mockParameterService.searchHistory).toHaveBeenCalled();
    });

    it('triggers the error check via the onComplete callback when the cycle completes', () => {
      component['startStatusRefreshCycle']([5, 6]);
      mockParameterService.searchParameterModeErrors.calls.reset();

      component['stopStatusRefreshCycle'](true);

      expect(mockParameterService.searchParameterModeErrors).toHaveBeenCalled();
    });
  });

  describe('getUpdateViewTitle', () => {
    it("returns 'Live' for the live action", () => {
      expect(component['getUpdateViewTitle']('live')).toBe('Live');
    });

    it("returns 'Trial' for the trial action", () => {
      expect(component['getUpdateViewTitle']('trial')).toBe('Trial');
    });

    it('returns an empty string for any other action', () => {
      expect(component['getUpdateViewTitle']('other')).toBe('');
    });
  });
});
