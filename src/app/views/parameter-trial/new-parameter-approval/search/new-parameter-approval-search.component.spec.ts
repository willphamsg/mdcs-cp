import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
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
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
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
    ]);
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

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

    expect(component.filterConfigs.length).toBe(2);
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
});
