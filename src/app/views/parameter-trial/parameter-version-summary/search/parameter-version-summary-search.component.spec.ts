import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { ParameterVersionSummaryService } from '@app/services/parameter-version-summary.service';
import { of } from 'rxjs';
import { ParameterVersionSummarySearchComponent } from './parameter-version-summary-search.component';

describe('ParameterVersionSummarySearchComponent', () => {
  let component: ParameterVersionSummarySearchComponent;
  let fixture: ComponentFixture<ParameterVersionSummarySearchComponent>;
  let mockParameterVersionSummaryService: jasmine.SpyObj<ParameterVersionSummaryService>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const mockDepots: IDepoList[] = [
    { depot_id: 1, depot_name: 'Depot A', depot_code: 'DA', version: 1 } as any,
    { depot_id: 2, depot_name: 'Depot B', depot_code: 'DB', version: 1 } as any,
  ];

  const mockParameterVersionSummary: any[] = [
    {
      id: 1,
      version: 1,
      depot_id: '1',
      file_id: 'F001',
      parameter_name: 'Param1',
      parameter_version: 'v1',
      effective_date: '2024-01-01',
      status: 'Active',
      chk: false,
    },
  ];

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: {
      parameter_version_summary: mockParameterVersionSummary,
      records_count: 1,
    },
  };

  beforeEach(waitForAsync(() => {
    mockParameterVersionSummaryService = jasmine.createSpyObj(
      'ParameterVersionSummaryService',
      ['search']
    );
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
    mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

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
    mockParameterVersionSummaryService.search.and.returnValue(
      of(mockPayloadResponse)
    );

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        {
          provide: ParameterVersionSummaryService,
          useValue: mockParameterVersionSummaryService,
        },
        { provide: DepoService, useValue: mockDepoService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: CommonService, useValue: mockCommonService },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(
      ParameterVersionSummarySearchComponent
    );
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

    expect(component.filterConfigs.length).toBeGreaterThanOrEqual(2);
    expect(component.filterConfigs[0].controlName).toBe('depots');
    expect(component.filterConfigs[0].options).toEqual(mockDepots);
  });

  it('should fetch parameter version summary list on reloadHandler with two args', () => {
    component.depots = mockDepots;
    component.reloadHandler();

    expect(
      mockParameterVersionSummaryService.search
    ).toHaveBeenCalledWith(component.params, jasmine.any(String));
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });
});
