import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
  waitForAsync,
} from '@angular/core/testing';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { IBusTransferList } from '@app/models/bus-transfer';
import { PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { AuthService } from '@app/services/auth.service';
import { BusSelectionService } from '@app/services/bus-selection.service';
import { ManageBusTransferService } from '@app/services/bus-transfer.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { MessageService } from '@app/services/message.service';
import { PaginationService } from '@app/services/pagination.service';
import { initialState } from '@app/store/bus.reducer';
import { provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { BusTransferSearchComponent } from './bus-transfer-search.component';

describe('BusTransferSearchComponent', () => {
  let component: BusTransferSearchComponent;
  let fixture: ComponentFixture<BusTransferSearchComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockManageBusTransferService: jasmine.SpyObj<ManageBusTransferService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockBusSelectionService: jasmine.SpyObj<BusSelectionService>;

  const mockDepots: IDepoList[] = [
    { depot_id: 1, depot_name: 'Depot A', depot_code: 'DA', version: 1 } as any,
    { depot_id: 2, depot_name: 'Depot B', depot_code: 'DB', version: 1 } as any,
  ];

  const mockBusTransferList: IBusTransferList[] = [
    {
      chk: false,
      id: 1,
      version: 0,
      bus_id: 'ZQY0103',
      bus_num: '1234',
      current_depot: ['1'],
      current_depot_name: ['Depot A'],
      current_operator: '1',
      current_operator_name: 'SBSTransit',
      current_effective_date: '2024-01-01',
      future_depot: ['2'],
      future_depot_name: ['Depot B'],
      future_operator: '2',
      future_operator_name: 'Go Ahead',
      status: '0',
      future_effective_date: '2024-06-01',
      target_effective_date: '2024-06-01',
      target_effective_time: '05:00',
    },
  ];

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: {
      bus_transfer_list: mockBusTransferList,
      records_count: 1,
    },
  };

  const filterServiceSpy = jasmine.createSpyObj('FilterService', [
    'getSelectedFilters',
    'updateFormGroup',
    'clearSelectedFilters',
      'updateSearchValue',
    'updateFilterConfigs',
  ]);

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', [
      'depoList$',
      'search',
    ]);
    mockCommonService = jasmine.createSpyObj('CommonService', [
      'search',
      'getDepotIds',
    ]);
    mockPaginationService = jasmine.createSpyObj('PaginationService', [
      'loadData',
      'paginateData',
      'getTotalPages',
      'clearPagination',
      'handlePageEvent',
    ]);
    mockMessageService = jasmine.createSpyObj('MessageService', [
      'MessageResponse',
    ]);
    mockManageBusTransferService = jasmine.createSpyObj(
      'ManageBusTransferService',
      ['search']
    );
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'getServiceProviderId',
      'getSVCProvider',
      'isDagw',
      'hasAccess',
      'isLTA',
    ]);
    mockBusSelectionService = jasmine.createSpyObj('BusSelectionService', [
      'clearBusTransferSelections',
      'isBusTransferSelected',
      'toggleBusTransferSelection',
      'addMultipleBusTransferSelections',
      'removeMultipleBusTransferSelections',
    ]);

    filterServiceSpy.searchValue$ = of('test');
    filterServiceSpy.filterValues$ = of({ test: ['1'] });
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
    mockMessageService.MessageResponse.and.returnValue(true);
    mockCommonService.search.and.returnValue(
      of({
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: '',
        payload: { svc_prov_info: [{ svc_prov_id: '1', svc_prov_name: 'SBS' }] },
      })
    );
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);
    mockManageBusTransferService.search.and.returnValue(
      of(mockPayloadResponse)
    );
    mockAuthService.getServiceProviderId.and.returnValue(1);
    mockAuthService.hasAccess.and.returnValue(true);
    mockAuthService.isLTA.and.returnValue(false);
    mockBusSelectionService.busTransferSelection$ = of([]);
    mockBusSelectionService.isBusTransferSelected.and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: FilterService, useValue: filterServiceSpy },
        { provide: CommonService, useValue: mockCommonService },
        { provide: MessageService, useValue: mockMessageService },
        {
          provide: ManageBusTransferService,
          useValue: mockManageBusTransferService,
        },
        { provide: AuthService, useValue: mockAuthService },
        { provide: BusSelectionService, useValue: mockBusSelectionService },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        provideMockStore({ initialState }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BusTransferSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should handle check all action', () => {
    const mockEvent = { checked: true } as MatCheckboxChange;
    component.dataSource = mockBusTransferList;

    component.checkAllHandler(mockEvent);
    expect(component.chkAll).toBeTrue();

    mockEvent.checked = false;
    component.checkAllHandler(mockEvent);
    expect(component.chkAll).toBeFalse();
  });

  it('should set filterConfigs in loadFilterValues', () => {
    component.depots = mockDepots;
    component.operators = [{ id: '1', value: 'SBS' }];
    component.loadFilterValues();

    expect(component.filterConfigs).toHaveSize(3);
    expect(component.filterConfigs[0].controlName).toBe('currDepot');
    expect(component.filterConfigs[0].options?.length).toBe(mockDepots.length);
  });

  it('should call pagination service on page change', () => {
    component.onPageChange({ page: 1, pageSize: 10 });

    expect(mockPaginationService.handlePageEvent).toHaveBeenCalled();
  });

  it('should call clearSelectedFilters on tabChange', () => {
    spyOn(component, 'reloadHandler');
    component.onTabChange();

    expect(filterServiceSpy.clearSelectedFilters).toHaveBeenCalled();
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
