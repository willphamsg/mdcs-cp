import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { INewParameterApproval } from '@app/models/parameter-trial';
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
import { NewParameterApprovalSearchComponent } from './new-parameter-approval-search.component';

describe('NewParameterApprovalSearchComponent', () => {
  let component: NewParameterApprovalSearchComponent;
  let fixture: ComponentFixture<NewParameterApprovalSearchComponent>;
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

  const mockApprovalList: any[] = [
    {
      id: 1,
      version: 1,
      depot_id: 1,
      depot_name: 'Depot A',
      parameter_name: 'Param1',
      parameter_version: 'v1',
      status_code: 0,
      last_update: '2024-01-01',
      chk: false,
    },
  ];

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: { new_parameter_approval_list: mockApprovalList, records_count: 1 },
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
      'searchNewParameterApprovalErrors',
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
      'clearSelections',
      'isSelected',
      'toggleSelection',
      'addMultipleSelections',
      'removeMultipleSelections',
      'getSelections',
      'addSelection',
      'removeSelection',
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
    mockParameterService.searchNewParameterApprovalErrors.and.returnValue(
      of({
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: '',
        payload: { new_parameter_approval_list: [] },
      })
    );
    mockSelectionService.selection$ = of([]);
    mockSelectionService.getSelections.and.returnValue([]);

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
    fixture = TestBed.createComponent(NewParameterApprovalSearchComponent);
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
    const element: INewParameterApproval = {
      chk: false,
      id: 42,
      version: 1,
      depot_id: 1,
      depot_name: 'Depot A',
    } as INewParameterApproval;

    it('adds the selection when the checkbox is checked', () => {
      component.checkHandler(
        { checked: true } as MatCheckboxChange,
        element
      );

      expect(element.chk).toBeTrue();
      expect(mockSelectionService.addSelection).toHaveBeenCalledWith(element);
    });

    it('removes the selection when the checkbox is unchecked', () => {
      component.checkHandler(
        { checked: false } as MatCheckboxChange,
        element
      );

      expect(element.chk).toBeFalse();
      expect(mockSelectionService.removeSelection).toHaveBeenCalledWith(
        element.id
      );
    });
  });

  describe('headerHandler / hiddenHandler', () => {
    it('updates the chk flag for the matching header entry', () => {
      const field = component.headerData[0].field;

      component.headerHandler({ checked: true } as MatCheckboxChange, {
        field,
      } as any);

      expect(
        component.headerData.find(x => x.field === field)!.chk
      ).toBeTrue();
    });

    it('returns the chk flag for a header field', () => {
      const field = component.headerData[0].field;
      component.headerData.find(x => x.field === field)!.chk = true;

      expect(component.hiddenHandler(field)).toBeTrue();
    });
  });

  describe('updateView title branches', () => {
    it('titles the dialog "Edit" for the update action', () => {
      component.updateView('update');

      const dialogArgs = mockDialog.open.calls.mostRecent().args;
      expect(dialogArgs[1].data.title).toBe('Edit Selected');
    });

    it('titles the dialog "Reject" for the reject action', () => {
      component.updateView('reject');

      const dialogArgs = mockDialog.open.calls.mostRecent().args;
      expect(dialogArgs[1].data.title).toBe('Reject Selected');
    });
  });

  describe('status refresh cycle', () => {
    it('drives onTick through refreshActionHistoryForPendingIds and onComplete through triggerErrorCheck', () => {
      mockParameterService.searchHistory.calls.reset();

      // Start the polling cycle wired up in the constructor.
      component['startStatusRefreshCycle']([101, 102]);

      expect(mockWebSocketService.refreshTrigger).toHaveBeenCalled();
      expect(component['statusRefresh'].pendingParamMasterIds).toEqual([
        101, 102,
      ]);

      // Firing the trigger invokes the onTick callback wired in the
      // constructor, which calls refreshActionHistoryForPendingIds().
      refreshTriggerSubject.next(null);

      expect(mockParameterService.searchHistory).toHaveBeenCalled();

      // Forcing completion invokes the onComplete callback wired in the
      // constructor, which calls triggerErrorCheck().
      component['statusRefresh'].stop(true);

      expect(
        mockParameterService.searchNewParameterApprovalErrors
      ).toHaveBeenCalled();
      expect(component['statusRefresh'].pendingParamMasterIds).toEqual([]);
    });

    it('does not refresh action history when there are no pending ids', () => {
      mockParameterService.searchHistory.calls.reset();

      component['refreshActionHistoryForPendingIds']();

      expect(mockParameterService.searchHistory).not.toHaveBeenCalled();
    });
  });
});
