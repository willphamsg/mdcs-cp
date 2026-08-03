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
import { of, Subject, throwError } from 'rxjs';
import { ParameterModeSearchComponent } from './parameter-mode-search.component';
import {
  IParameterMode,
  IValidatedParameterStatus,
} from '@models/parameter-trial';

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
      'validateLive',
      'validateTrial',
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
    // mockDialog is a module-level object shared across every test in this
    // file, so its `open` spy accumulates calls from earlier tests unless
    // explicitly reset here. Without this, assertions like
    // `expect(mockDialog.open).not.toHaveBeenCalled()` can fail purely due
    // to a prior test having already opened the dialog.
    mockDialog.open.calls.reset();
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

  describe('updateView', () => {
    it('should warn and skip the dialog when no selections are made', () => {
      mockSelectionService.getParameterModeSelections.and.returnValue([]);

      component.updateView('view');

      expect(mockStore.dispatch).toHaveBeenCalled();
      expect(mockDialog.open).not.toHaveBeenCalled();
    });

    it("should validate selections for the 'live' action instead of opening the dialog directly", () => {
      mockSelectionService.getParameterModeSelections.and.returnValue([
        { param_master_id: 1, depot_id: 1, parameter_name: 'P1', parameter_version: 'v1', chk: false } as any,
      ]);
      mockParameterService.validateLive.and.returnValue(
        of({ status: 200, message: 'ok', payload: { validated_parameter_status: [] } } as any)
      );

      component.updateView('live');

      expect(mockParameterService.validateLive).toHaveBeenCalled();
      expect(mockParameterService.validateTrial).not.toHaveBeenCalled();
    });

    it("should validate selections for the 'trial' action", () => {
      mockSelectionService.getParameterModeSelections.and.returnValue([
        { param_master_id: 1, depot_id: 1, parameter_name: 'P1', parameter_version: 'v1', chk: false } as any,
      ]);
      mockParameterService.validateTrial.and.returnValue(
        of({ status: 200, message: 'ok', payload: { validated_parameter_status: [] } } as any)
      );

      component.updateView('trial');

      expect(mockParameterService.validateTrial).toHaveBeenCalled();
      expect(mockParameterService.validateLive).not.toHaveBeenCalled();
    });

    it('should open the view dialog directly for non-live/trial actions', () => {
      mockSelectionService.getParameterModeSelections.and.returnValue([
        { param_master_id: 1, depot_id: 1, parameter_name: 'P1', parameter_version: 'v1', chk: false } as any,
      ]);

      component.updateView('view');

      expect(mockDialog.open).toHaveBeenCalled();
      const dialogArgs = mockDialog.open.calls.mostRecent().args[1];
      expect(dialogArgs.data.userActionType).toBe('NONE');
    });
  });

  describe('validateSelectionsFor (via updateView)', () => {
    it('should warn and skip validation when the payload is empty', () => {
      mockSelectionService.getParameterModeSelections.and.returnValue([
        { param_master_id: 1, depot_id: 'not-a-number', parameter_name: 'P1', chk: false } as any,
      ]);

      component.updateView('live');

      expect(mockParameterService.validateLive).not.toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should show the server message when validation responds with a non-200 status', () => {
      mockSelectionService.getParameterModeSelections.and.returnValue([
        { param_master_id: 1, depot_id: 1, parameter_name: 'P1', chk: false } as any,
      ]);
      mockParameterService.validateLive.and.returnValue(
        of({ status: 400, message: 'Server said no', payload: {} } as any)
      );

      component.updateView('live');

      expect(mockDialog.open).not.toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should fall back to a default message when validation fails without a server message', () => {
      mockSelectionService.getParameterModeSelections.and.returnValue([
        { param_master_id: 1, depot_id: 1, parameter_name: 'P1', chk: false } as any,
      ]);
      mockParameterService.validateLive.and.returnValue(
        of({ status: 400, message: '', payload: {} } as any)
      );

      component.updateView('live');

      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should open the dialog with merged selections when validation succeeds', () => {
      const selections: IParameterMode[] = [
        { param_master_id: 1, depot_id: 1, depot_name: 'Depot A', parameter_name: 'P1', parameter_version: 'v1', chk: false, id: 1, version: 1 },
      ];
      mockSelectionService.getParameterModeSelections.and.returnValue(selections);
      const validatedStatuses: IValidatedParameterStatus[] = [
        {
          parameter_status: { param_master_id: 1, depot_id: 1, parameter_name: 'P1-validated' },
          scenario_details: { user_action_type: 'OK' },
        },
      ];
      mockParameterService.validateLive.and.returnValue(
        of({ status: 200, message: 'ok', payload: { validated_parameter_status: validatedStatuses } } as any)
      );

      component.updateView('live');

      expect(mockDialog.open).toHaveBeenCalled();
      const dialogArgs = mockDialog.open.calls.mostRecent().args[1];
      expect(dialogArgs.data.userActionType).toBe('OK');
      expect(dialogArgs.data.selection[0].parameter_name).toBe('P1-validated');
    });

    it('should dispatch an error notification when validation errors out', () => {
      mockSelectionService.getParameterModeSelections.and.returnValue([
        { param_master_id: 1, depot_id: 1, parameter_name: 'P1', chk: false } as any,
      ]);
      mockParameterService.validateLive.and.returnValue(
        throwError(() => new Error('network down'))
      );

      component.updateView('live');

      expect(mockStore.dispatch).toHaveBeenCalled();
      expect(mockDialog.open).not.toHaveBeenCalled();
    });
  });

  describe('buildValidationPayload', () => {
    it('should include only selections with a numeric param_master_id and a numeric depot_id', () => {
      const selections: any[] = [
        { param_master_id: 1, depot_id: 1, parameter_name: 'A', parameter_version: 'v1' },
        { param_master_id: undefined, depot_id: 1, parameter_name: 'B' },
        { param_master_id: 2, depot_id: undefined, parameter_name: 'C' },
        { param_master_id: 3, depot_id: 'not-numeric', parameter_name: 'D' },
        { param_master_id: '4', depot_id: 1, parameter_name: 'E' },
      ];

      const payload = component['buildValidationPayload'](selections);

      expect(payload).toHaveSize(1);
      expect(payload[0]).toEqual(
        jasmine.objectContaining({ param_master_id: 1, depot_id: 1, parameter_name: 'A' })
      );
    });

    it('should return an empty array when nothing qualifies', () => {
      const payload = component['buildValidationPayload']([
        { param_master_id: undefined, depot_id: undefined } as any,
      ]);

      expect(payload).toEqual([]);
    });
  });

  describe('mergeValidatedStatuses', () => {
    const originalSelections: IParameterMode[] = [
      {
        id: 1,
        version: 1,
        param_master_id: 1,
        depot_id: 1,
        depot_name: 'Depot A',
        parameter_name: 'Original',
        parameter_version: 'v1',
        chk: false,
      },
    ];

    it('should return the original selections unchanged when there are no validated statuses', () => {
      expect(
        component['mergeValidatedStatuses'](undefined as any, originalSelections)
      ).toBe(originalSelections);
      expect(component['mergeValidatedStatuses']([], originalSelections)).toBe(
        originalSelections
      );
    });

    it('should merge a matching validated status onto the original selection', () => {
      component.depots = [
        { depot_id: 1, depot_name: 'Depot A', depot_code: 'DA', version: 1 } as any,
      ];
      const validated: IValidatedParameterStatus[] = [
        {
          parameter_status: {
            param_master_id: 1,
            depot_id: 1,
            parameter_name: 'Merged',
            parameter_version: 'v2',
          },
        },
      ];

      const merged = component['mergeValidatedStatuses'](validated, originalSelections);

      expect(merged).toHaveSize(1);
      expect(merged[0].parameter_name).toBe('Merged');
      expect(merged[0].depot_name).toBe('Depot A');
    });

    it('should synthesize a new item when no source selection matches', () => {
      const validated: IValidatedParameterStatus[] = [
        {
          parameter_status: {
            param_master_id: 999,
            depot_id: 1,
            parameter_name: 'Unmatched',
          },
        },
      ];

      const merged = component['mergeValidatedStatuses'](validated, originalSelections);

      expect(merged).toHaveSize(2);
      const synthesized = merged.find(item => item.parameter_name === 'Unmatched');
      expect(synthesized).toBeTruthy();
      expect(synthesized!.chk).toBeFalse();
    });

    it('should fall back to "Unknown Depot" when no depot can be resolved', () => {
      component.depots = [];
      const validated: IValidatedParameterStatus[] = [
        {
          parameter_status: {
            param_master_id: 1,
            depot_id: 777,
            parameter_name: 'NoDepot',
          },
        },
      ];

      const merged = component['mergeValidatedStatuses'](validated, [
        { ...originalSelections[0], depot_name: undefined as any },
      ]);

      expect(merged[0].depot_name).toBeDefined();
    });

    it('should keep unvalidated original selections that were not handled', () => {
      const untouched: IParameterMode = {
        id: 2,
        version: 1,
        param_master_id: 2,
        depot_id: 2,
        depot_name: 'Depot B',
        parameter_name: 'Untouched',
        parameter_version: 'v1',
        chk: false,
      };
      const validated: IValidatedParameterStatus[] = [
        { parameter_status: { param_master_id: 1, depot_id: 1, parameter_name: 'Merged' } },
      ];

      const merged = component['mergeValidatedStatuses'](validated, [
        ...originalSelections,
        untouched,
      ]);

      expect(merged.some(item => item.parameter_name === 'Untouched')).toBeTrue();
    });

    it('should always keep original selections without a numeric param_master_id', () => {
      const nonNumeric: IParameterMode = {
        id: 3,
        version: 1,
        param_master_id: undefined,
        depot_id: 3,
        depot_name: 'Depot C',
        parameter_name: 'NonNumeric',
        parameter_version: 'v1',
        chk: false,
      };
      const validated: IValidatedParameterStatus[] = [
        { parameter_status: { param_master_id: 1, depot_id: 1, parameter_name: 'Merged' } },
      ];

      const merged = component['mergeValidatedStatuses'](validated, [nonNumeric]);

      expect(merged.some(item => item.parameter_name === 'NonNumeric')).toBeTrue();
    });
  });

  describe('extractUserActionType', () => {
    it('should return the discovered user_action_type', () => {
      const validated: IValidatedParameterStatus[] = [
        { parameter_status: {}, scenario_details: { user_action_type: 'YES_NO' } },
      ];

      expect(component['extractUserActionType'](validated)).toBe('YES_NO');
    });

    it("should fall back to 'NONE' when nothing matches", () => {
      expect(component['extractUserActionType']([])).toBe('NONE');
      expect(
        component['extractUserActionType']([{ parameter_status: {} }] as any)
      ).toBe('NONE');
    });
  });

  describe('showSnackbarNotification', () => {
    it("should default typeSnackbar to 'info' when not provided", () => {
      component['showSnackbarNotification']('a message', 'a title');

      expect(mockStore.dispatch).toHaveBeenCalled();
    });
  });
});
