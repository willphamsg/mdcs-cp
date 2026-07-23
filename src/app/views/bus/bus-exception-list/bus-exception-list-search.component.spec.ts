import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { IBustExpList } from '@app/models/bus-exception-list';
import { PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { ManageBusExceptionListService } from '@app/services/bus-exception-list.service';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import DummyData from '@data/db.json';
import { of } from 'rxjs';
import { BusExceptionListSearchComponent } from './bus-exception-list-search.component';
import { PaginationService } from '@app/services/pagination.service';
import { CommonService } from '@app/services/common.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('BusExceptionListSearchComponent', () => {
  let component: BusExceptionListSearchComponent;
  let fixture: ComponentFixture<BusExceptionListSearchComponent>;
  let mockBusExceptionListService: jasmine.SpyObj<ManageBusExceptionListService>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;

  const mockDepots: IDepoList[] = DummyData.depot_list;

  const mockBusExceptionList: IBustExpList[] = DummyData.bus_exception_list;

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: { bus_exception_list: mockBusExceptionList },
  };

  mockFilterService = jasmine.createSpyObj('FilterService', [
    'getSelectedFilters',
    'updateFormGroup',
    'clearSelectedFilters',
      'updateSearchValue',
  ]);
  mockPaginationService = jasmine.createSpyObj('PaginationService', [
    'loadData',
    'paginateData',
    'getTotalPages',
    'clearPagination',
    'handlePageEvent',
  ]);
  mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);

  beforeEach(waitForAsync(() => {
    mockBusExceptionListService = jasmine.createSpyObj('DailyReportService', [
      'search',
    ]);
    mockDepoService = jasmine.createSpyObj('DepoService', [
      'depo$',
      'depoList$',
    ]);

    mockFilterService.searchValue$ = of('test');
    mockFilterService.filterValues$ = of({ test: ['1'] });
    mockDepoService.depoList$ = of(mockDepots);
    mockBusExceptionListService.search.and.returnValue(of(mockPayloadResponse));
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);

    TestBed.configureTestingModule({
    imports: [BrowserAnimationsModule],
    providers: [
        {
            provide: ManageBusExceptionListService,
            useValue: mockBusExceptionListService,
        },
        { provide: DepoService, useValue: mockDepoService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: CommonService, useValue: mockCommonService },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
}).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BusExceptionListSearchComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load depots and call reloadHandler on depo change', () => {
    mockDepoService.depoList$ = of(mockDepots);

    spyOn(component, 'reloadHandler');

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.depots).toEqual(mockDepots);
    expect(component.reloadHandler).toHaveBeenCalled();
  });

  it('should set filterConfigs in loadFilterValues', () => {
    component.loadFilterValues();

    expect(component.filterConfigs.length).toBe(1);
    expect(component.filterConfigs[0].controlName).toBe('depots');
    expect(component.filterConfigs[0].options?.length).toBe(mockDepots.length);
  });

  it('should call pagination service on page change', () => {
    component.onPageChange({ page: 1, pageSize: 10 });

    expect(mockPaginationService.handlePageEvent).toHaveBeenCalled();
    expect(component.params.page_index).toBe(0);
    expect(component.params.page_size).toBe(10);
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
