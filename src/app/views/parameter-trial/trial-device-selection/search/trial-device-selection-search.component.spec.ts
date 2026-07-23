import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { IDepoList } from '@app/models/depo';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { ParameterSelectionService } from '@app/services/parameter-selection.service';
import { TrialDeviceSelectionService } from '@app/services/trial-device-selection.service';
import { of } from 'rxjs';
import { TrialDeviceSelectionSearchComponent } from './trial-device-selection-search.component';

describe('TrialDeviceSelectionSearchComponent', () => {
  let component: TrialDeviceSelectionSearchComponent;
  let fixture: ComponentFixture<TrialDeviceSelectionSearchComponent>;
  let mockTrialDeviceSelectionService: jasmine.SpyObj<TrialDeviceSelectionService>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockSelectionService: jasmine.SpyObj<ParameterSelectionService>;

  const mockDepots: IDepoList[] = [
    { depot_id: 1, depot_name: 'Depot A', depot_code: 'DA', version: 1 } as any,
    { depot_id: 2, depot_name: 'Depot B', depot_code: 'DB', version: 1 } as any,
  ];

  const mockTrialList: any[] = [
    {
      id: 1,
      depot_id: 1,
      depot: 'Depot A',
      bus_num: '1234',
      svc_provider_id: 1,
      trial_group: true,
      service_group: false,
      parameter_group: false,
      chk: false,
    },
    {
      id: 2,
      depot_id: 2,
      depot: 'Depot B',
      bus_num: '5678',
      svc_provider_id: 1,
      trial_group: false,
      service_group: true,
      parameter_group: false,
      chk: false,
    },
  ];

  const mockPayloadResponse = {
    status: 201,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: {
      trial_device_summary_list: mockTrialList,
      records_count: 2,
    },
  };

  const mockDialogRef = {
    afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of()),
  };

  const mockDialog = {
    open: jasmine.createSpy('open').and.returnValue(mockDialogRef),
  };

  beforeEach(waitForAsync(() => {
    mockTrialDeviceSelectionService = jasmine.createSpyObj(
      'TrialDeviceSelectionService',
      ['search']
    );
    mockDepoService = jasmine.createSpyObj('DepoService', ['depoList$']);
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
    mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'getServiceProviderId',
      'getSVCProvider',
      'isDagw',
      'hasAccess',
    ]);
    mockSelectionService = jasmine.createSpyObj('ParameterSelectionService', [
      'clearTrialDeviceSelections',
      'isTrialDeviceSelected',
      'toggleTrialDeviceSelection',
      'addMultipleTrialDeviceSelections',
      'removeMultipleTrialDeviceSelections',
      'getTrialDeviceSelections',
    ]);

    mockDepoService.depoList$ = of(mockDepots);
    mockFilterService.searchValue$ = of('');
    mockFilterService.filterValues$ = of({});
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);
    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.hasAccess.and.returnValue(true);
    mockTrialDeviceSelectionService.search.and.returnValue(
      of(mockPayloadResponse as any)
    );
    mockSelectionService.trialDeviceSelection$ = of([]);
    mockSelectionService.isTrialDeviceSelected.and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        {
          provide: TrialDeviceSelectionService,
          useValue: mockTrialDeviceSelectionService,
        },
        { provide: DepoService, useValue: mockDepoService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ParameterSelectionService, useValue: mockSelectionService },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TrialDeviceSelectionSearchComponent);
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

  it('should handle check all action', () => {
    component.dataSource = mockTrialList as any[];

    const mockEvent = { checked: true } as MatCheckboxChange;
    component.checkAllHandler(mockEvent);
    expect(component.chkAll).toBeTrue();

    mockEvent.checked = false;
    component.checkAllHandler(mockEvent);
    expect(component.chkAll).toBeFalse();
  });

  it('should set filterConfigs in loadFilterValues', () => {
    component.depots = mockDepots;
    component.loadFilterValues();

    expect(component.filterConfigs).toHaveSize(4);
    expect(component.filterConfigs[0].controlName).toBe('depots');
    expect(component.filterConfigs[0].options?.length).toBe(mockDepots.length);
  });

  it('should load depots and call reloadHandler on depo change', () => {
    spyOn(component, 'reloadHandler').and.callThrough();

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.depots).toEqual(mockDepots);
    expect(component.reloadHandler).toHaveBeenCalled();
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
