import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
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
import { of } from 'rxjs';
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
    ]);

    mockDepoService.depoList$ = of(mockDepots);
    mockFilterService.searchValue$ = of('test');
    mockFilterService.filterValues$ = of({ test: ['1'] });
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);
    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.hasAccess.and.returnValue(true);
    mockAuthService.isWebSocketEnabled.and.returnValue(false);
    mockManageDailyBusListService.search.and.returnValue(of(mockPayloadResponse));
    mockBusSelectionService.dailyBusListSelection$ = of([]);
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
    expect(component.filterConfigs.length).toBe(2);
    expect(component.filterConfigs[0].controlName).toBe('depotsSec');
  });

  it('should update dataSource after calling reloadHandler', () => {
    component.reloadHandler();
    expect(component.dataSource.length).toBe(mockBusList.length);
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
});
