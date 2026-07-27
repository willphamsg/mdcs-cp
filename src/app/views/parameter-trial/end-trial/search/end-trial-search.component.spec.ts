import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  flush,
  tick,
  waitForAsync,
} from '@angular/core/testing';
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
import { Subject, of } from 'rxjs';
import { EndTrialSearchComponent } from './end-trial-search.component';

describe('EndTrialSearchComponent', () => {
  let component: EndTrialSearchComponent;
  let fixture: ComponentFixture<EndTrialSearchComponent>;
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

  const mockEndTrialList: any[] = [
    {
      id: 1,
      version: 1,
      depot_id: 1,
      depot_name: 'Depot A',
      parameter_name: 'Param1',
      parameter_version: 'v1',
      chk: false,
    },
  ];

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: { end_trial_list: mockEndTrialList, records_count: 1 },
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
      'searchEndTrialErrors',
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
      'clearEndTrialSelections',
      'isEndTrialSelected',
      'toggleEndTrialSelection',
      'addMultipleEndTrialSelections',
      'removeMultipleEndTrialSelections',
      'getEndTrialSelections',
      'addEndTrialSelection',
      'removeEndTrialSelection',
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
    mockSelectionService.endTrialSelection$ = of([]);
    mockSelectionService.isEndTrialSelected.and.returnValue(false);
    mockSelectionService.getEndTrialSelections.and.returnValue([]);
    mockParameterService.searchEndTrialErrors.and.returnValue(
      of(mockPayloadResponse)
    );

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
    fixture = TestBed.createComponent(EndTrialSearchComponent);
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

  it('should call reloadHandler and invoke service search', () => {
    component.depots = mockDepots;
    component.reloadHandler();
    expect(mockParameterService.search).toHaveBeenCalled();
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  describe('checkHandler', () => {
    it('should add the element to the selection service when checked', () => {
      const element = { id: 'row-1', chk: false } as any;
      const event = { checked: true } as MatCheckboxChange;

      component.checkHandler(event, element);

      expect(element.chk).toBeTrue();
      expect(mockSelectionService.addEndTrialSelection).toHaveBeenCalledWith(
        element
      );
      expect(
        mockSelectionService.removeEndTrialSelection
      ).not.toHaveBeenCalled();
    });

    it('should remove the element from the selection service when unchecked', () => {
      const element = { id: 'row-2', chk: true } as any;
      const event = { checked: false } as MatCheckboxChange;

      component.checkHandler(event, element);

      expect(element.chk).toBeFalse();
      expect(
        mockSelectionService.removeEndTrialSelection
      ).toHaveBeenCalledWith('row-2');
      expect(mockSelectionService.addEndTrialSelection).not.toHaveBeenCalled();
    });
  });

  it('should update the header chk state via headerHandler', () => {
    const field = component.headerData[0].field;

    component.headerHandler({ checked: true } as MatCheckboxChange, {
      field,
    } as any);

    expect(component.headerData.find(h => h.field === field)!.chk).toBeTrue();
  });

  describe('updateView title resolution', () => {
    beforeEach(() => {
      mockDialogRef.afterClosed.and.returnValue(of('cancel'));
    });

    it('should title the dialog "Accept Selected" for trial-to-live', () => {
      component.updateView('trial-to-live');

      const dialogArgs = mockDialog.open.calls.mostRecent().args[1];
      expect(dialogArgs.data.title).toBe('Accept Selected');
    });

    it('should title the dialog "Reject Selected" for reject-trial', () => {
      component.updateView('reject-trial');

      const dialogArgs = mockDialog.open.calls.mostRecent().args[1];
      expect(dialogArgs.data.title).toBe('Reject Selected');
    });

    it('should title the dialog with an empty prefix for an unrecognized action', () => {
      component.updateView('some-other-action');

      const dialogArgs = mockDialog.open.calls.mostRecent().args[1];
      expect(dialogArgs.data.title).toBe(' Selected');
    });
  });

  it('should be a no-op and not switch tabs when the dialog is cancelled', () => {
    mockDialogRef.afterClosed.and.returnValue(of('cancel'));
    const reloadSpy = spyOn(component, 'reloadHandler');
    const startCycleSpy = spyOn<any>(component, 'startStatusRefreshCycle');
    const initialTabIdx = component.tabIdx;

    component.updateView('trial-to-live');

    expect(component.tabIdx).toBe(initialTabIdx);
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(startCycleSpy).not.toHaveBeenCalled();
  });

  it(
    'should run the full trial-to-live status refresh cycle: onTick refreshes ' +
      'action history and, once the refresh window elapses, onComplete triggers the error check',
    fakeAsync(() => {
      mockSelectionService.getEndTrialSelections.and.returnValue([
        { id: '42_1', param_master_id: 42 } as any,
      ]);
      mockDialogRef.afterClosed.and.returnValue(of('confirm'));

      component.updateView('trial-to-live');

      // The dialog closing (synchronously, via `of('confirm')`) should have
      // switched to the Action History tab and kicked off the refresh cycle,
      // which subscribes to the injected WebSocketService refresh trigger.
      expect(component.tabIdx).toBe(1);
      expect(mockWebSocketService.refreshTrigger).toHaveBeenCalled();

      mockParameterService.searchHistory.calls.reset();

      // Fire a tick while still inside the refresh window: onTick should
      // refresh the action-history tab for the pending ids.
      refreshTriggerSubject.next(null);

      expect(mockParameterService.searchHistory).toHaveBeenCalled();
      expect(mockParameterService.searchEndTrialErrors).not.toHaveBeenCalled();

      // Advance past the refresh window (trialSchedulerRateSeconds = 60 + 30
      // buffer = 90s) so the cycle auto-completes and onComplete fires.
      tick(90000);

      expect(mockParameterService.searchEndTrialErrors).toHaveBeenCalled();

      flush();
    })
  );
});
