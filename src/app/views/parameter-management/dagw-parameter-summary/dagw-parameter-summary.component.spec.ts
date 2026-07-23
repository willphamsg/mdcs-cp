import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { DagwParameterSummaryService } from '@app/services/dagw-parameter-summary.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { of } from 'rxjs';
import { DagwParameterSummaryComponent } from './dagw-parameter-summary.component';

describe('DagwParameterSummaryComponent', () => {
  let component: DagwParameterSummaryComponent;
  let fixture: ComponentFixture<DagwParameterSummaryComponent>;

  let mockDagwParameterSummaryService: jasmine.SpyObj<DagwParameterSummaryService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;

  const mockDepots: IDepoList[] = [
    { depot_id: 1, depot_name: 'Depot A', depot_code: 'DA', version: 1 } as any,
    { depot_id: 2, depot_name: 'Depot B', depot_code: 'DB', version: 1 } as any,
  ];

  const mockDagwList: any[] = [
    {
      id: 1,
      version: 1,
      depot_id: '1',
      parameter_name: 'Param1',
      mdcs_live: { isActive: true, value: 'v1' },
      effective_date_live: '2024-01-01',
      effective_date_trial: '2024-01-02',
      consistency: 'Yes',
    },
    {
      id: 2,
      version: 1,
      depot_id: '2',
      parameter_name: 'Param2',
      mdcs_live: { isActive: false, value: 'v2' },
      effective_date_live: '2024-02-01',
      effective_date_trial: '2024-02-02',
      consistency: 'No',
    },
  ];

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: { dagw_parameter_summary: mockDagwList, records_count: 2 },
  };

  beforeEach(waitForAsync(() => {
    mockDagwParameterSummaryService = jasmine.createSpyObj(
      'DagwParameterSummaryService',
      ['search']
    );
    mockPaginationService = jasmine.createSpyObj('PaginationService', [
      'paginatedData$',
      'loadData',
      'paginateData',
      'getTotalPages',
      'clearPagination',
      'handlePageEvent',
    ]);
    mockFilterService = jasmine.createSpyObj('FilterService', [
      'getSelectedFilters',
      'updateFormGroup',
      'clearSelectedFilters',
      'updateSearchValue',
      'updateFilterConfigs',
    ]);
    mockDepoService = jasmine.createSpyObj('DepoService', ['depoList$']);
    mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);

    mockDepoService.depoList$ = of(mockDepots);
    mockFilterService.searchValue$ = of('test');
    mockFilterService.filterValues$ = of({ test: ['1'] });
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);

    mockDagwParameterSummaryService.search.and.returnValue(
      of(mockPayloadResponse)
    );

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        {
          provide: DagwParameterSummaryService,
          useValue: mockDagwParameterSummaryService,
        },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: CommonService, useValue: mockCommonService },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DagwParameterSummaryComponent);
    component = fixture.componentInstance;

    mockFilterService.getSelectedFilters.and.returnValue({});

    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load depots and set search_text on initialization', () => {
    spyOn(component, 'reloadHandler').and.callThrough();

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.depots).toEqual(mockDepots);
    expect(component.params.search_text).toBe('test');
    expect(component.reloadHandler).toHaveBeenCalled();
  });

  it('should load filter values', () => {
    component.loadFilterValues();
    fixture.detectChanges();

    expect(component.filterConfigs.length).toBe(4);
    expect(component.filterConfigs[0].controlName).toBe('depotsSec');
    expect(component.filterConfigs[0].options).toEqual(mockDepots);
  });

  it('should update dataSource after calling reloadHandler', () => {
    component.reloadHandler();
    fixture.detectChanges();

    expect(component.dataSource.length).toBe(mockDagwList.length);
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
