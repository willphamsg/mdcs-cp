import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { IDepoList } from '@app/models/depo';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DagwParameterSummaryService } from '@app/services/dagw-parameter-summary.service';
import { DepoService } from '@app/services/depo.service';
import { FilterService } from '@app/services/filter.service';
import { MaintenanceSharedService } from '@app/services/maintenance-shared.service';
import { PaginationService } from '@app/services/pagination.service';
import DummyData from '@data/db.json';
import { of } from 'rxjs';
import { AuditLogComponent } from './audit-log.component';

describe('AuditLogComponent', () => {
  let component: AuditLogComponent;
  let fixture: ComponentFixture<AuditLogComponent>;
  let mockSharedService: jasmine.SpyObj<MaintenanceSharedService>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockDagwService: jasmine.SpyObj<DagwParameterSummaryService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;

  const mockDepots: IDepoList[] = DummyData.depot_list;

  beforeEach(waitForAsync(() => {
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of(mockDepots),
    });
    mockSharedService = jasmine.createSpyObj('MaintenanceSharedService', [
      'getUpdateTypeItems', 'viewAuditTrail', 'updateSelectedDepot', 'resetFormGroup',
    ]);
    mockFilterService = jasmine.createSpyObj('FilterService', [
      'getSelectedFilters', 'updateFormGroup', 'clearSelectedFilters', 'updateSearchValue',
    ], {
      searchValue$: of(''),
      filterValues$: of({}),
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider', 'isDagw', 'hasAccess']);
    mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);
    mockDagwService = jasmine.createSpyObj('DagwParameterSummaryService', ['search']);
    mockPaginationService = jasmine.createSpyObj('PaginationService', [
      'handlePageEvent', 'loadData', 'paginateData', 'getTotalPages', 'clearPagination',
    ]);

    mockAuthService.getSVCProvider.and.returnValue('1');
    mockAuthService.hasAccess.and.returnValue(true);
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);
    mockSharedService.getUpdateTypeItems.and.returnValue(of([]));
    mockSharedService.viewAuditTrail.and.returnValue(of({
      status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK',
      payload: { audit_trail_log: [], records_count: 0 },
    }));

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: MaintenanceSharedService, useValue: mockSharedService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: DagwParameterSummaryService, useValue: mockDagwService },
        { provide: PaginationService, useValue: mockPaginationService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AuditLogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load filter values and configurations', () => {
    component.loadFilterValues();
    expect(component.filterConfigs.length).toBeGreaterThan(0);
  });
});
