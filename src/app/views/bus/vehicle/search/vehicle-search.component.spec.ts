import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FilterService } from '@app/services/filter.service';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { BusSelectionService } from '@app/services/bus-selection.service';
import DummyData from '@data/db.json';
import { PayloadResponse } from '@models/common';
import { IDepoList } from '@models/depo';
import { IVehicleList } from '@models/vehicle-list';
import { DepoService } from '@services/depo.service';
import { MasterService } from '@services/master.service';
import { MessageService } from '@services/message.service';
import { of } from 'rxjs';
import { VehicleSearchComponent } from './vehicle-search.component';
import { PaginationService } from '@app/services/pagination.service';

describe('VehicleSearchComponent', () => {
  let component: VehicleSearchComponent;
  let fixture: ComponentFixture<VehicleSearchComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockMasterService: jasmine.SpyObj<MasterService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockBusSelectionService: jasmine.SpyObj<BusSelectionService>;

  const mockDepots: IDepoList[] = DummyData.depot_list;
  const mockVehicleList: IVehicleList[] = DummyData.master_bus_list.map(
    (data: any) => ({ ...data, depot_name: 'test' })
  );

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: { master_bus_list: mockVehicleList, records_count: mockVehicleList.length },
  };

  const mockDialogRef = {
    afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(true)),
  };

  const mockDialog = {
    open: jasmine.createSpy('open').and.returnValue(mockDialogRef),
  };

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['depoList$']);
    mockFilterService = jasmine.createSpyObj('FilterService', [
      'getSelectedFilters', 'updateFormGroup', 'clearSelectedFilters', 'updateSearchValue', 'updateFilterConfigs',
    ]);
    mockMasterService = jasmine.createSpyObj('MasterService', ['search', 'delete']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['warning', 'confirmation']);
    mockPaginationService = jasmine.createSpyObj('PaginationService', [
      'loadData', 'paginateData', 'getTotalPages', 'clearPagination', 'handlePageEvent',
    ]);
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isDagw', 'hasAccess', 'isWebSocketEnabled', 'wsUrl', 'getToken',
    ]);
    mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);
    mockBusSelectionService = jasmine.createSpyObj('BusSelectionService', [
      'clearVehicleSelections', 'isVehicleSelected', 'toggleVehicleSelection',
      'addMultipleVehicleSelections', 'removeMultipleVehicleSelections', 'getVehicleSelections',
    ]);

    mockDepoService.depoList$ = of(mockDepots);
    mockFilterService.searchValue$ = of('test');
    mockFilterService.filterValues$ = of({ test: ['1'] });
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);
    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.hasAccess.and.returnValue(true);
    mockAuthService.isWebSocketEnabled.and.returnValue(false);
    mockMasterService.search.and.returnValue(of(mockPayloadResponse));
    mockBusSelectionService.vehicleSelection$ = of([]);
    mockBusSelectionService.isVehicleSelected = jasmine.createSpy().and.returnValue(false);
    mockBusSelectionService.getVehicleSelections.and.returnValue([]);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: MasterService, useValue: mockMasterService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: BusSelectionService, useValue: mockBusSelectionService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(VehicleSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load depots and set search_text on initialization', () => {
    expect(component.depots).toEqual(mockDepots);
    expect(component.params.search_text).toBe('test');
    expect(mockMasterService.search).toHaveBeenCalled();
  });

  it('should load filter values with depotsSec', () => {
    component.depots = mockDepots;
    component.loadFilterValues();
    // Non-dagw mode: depotsSec + effectiveDate + status = 3 configs
    expect(component.filterConfigs).toHaveSize(3);
    expect(component.filterConfigs[0].controlName).toBe('depotsSec');
  });

  it('should update dataSource after calling reloadHandler', () => {
    component.reloadHandler();
    expect(component.dataSource).toHaveSize(mockVehicleList.length);
  });

  it('should handle tab change and call reloadHandler', () => {
    spyOn(component, 'reloadHandler').and.callThrough();
    component.onTabChange();
    expect(mockFilterService.clearSelectedFilters).toHaveBeenCalled();
  });

  it('should open view dialog and call reloadHandler after closing', () => {
    spyOn(component, 'reloadHandler').and.callThrough();
    component.openView();
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should open update view dialog and call reloadHandler after closing', () => {
    spyOn(component, 'reloadHandler').and.callThrough();
    component.updateView('update');
    expect(mockDialog.open).toHaveBeenCalled();
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
