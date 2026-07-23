import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { FileImportExportService } from '@app/services/file-import-export.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { ParameterService } from '@app/services/parameter.service';
import { Store } from '@ngrx/store';
import DummyData from '@data/db.json';
import { of } from 'rxjs';
import { ParameterFileImportComponent } from './parameter-file-import.component';

describe('ParameterFileImportComponent', () => {
  let component: ParameterFileImportComponent;
  let fixture: ComponentFixture<ParameterFileImportComponent>;
  let mockFileImportExportService: jasmine.SpyObj<FileImportExportService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockFilterService: jasmine.SpyObj<FilterService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockParameterService: jasmine.SpyObj<ParameterService>;
  let mockStore: jasmine.SpyObj<Store>;

  beforeEach(waitForAsync(() => {
    mockFileImportExportService = jasmine.createSpyObj('FileImportExportService', [
      'getDepotService', 'manage', 'import',
    ]);
    mockPaginationService = jasmine.createSpyObj('PaginationService', [
      'handlePageEvent', 'loadData', 'paginateData', 'getTotalPages', 'clearPagination',
    ], { paginatedData$: of([]), currentPage: 1, pageSize: 10, totalItems: 0 });
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true),
    } as any);
    mockDepoService = jasmine.createSpyObj('DepoService', ['search'], {
      depoList$: of(DummyData.depot_list),
    });
    mockFilterService = jasmine.createSpyObj('FilterService', [
      'updateSearchValue', 'clearSelectedFilters', 'updateFilterConfigs',
    ], {
      searchValue$: of(''),
      filterValues$: of({}),
    });
    mockAuthService = jasmine.createSpyObj('AuthService', ['getSVCProvider', 'hasAccess', 'isDagw']);
    mockCommonService = jasmine.createSpyObj('CommonService', ['getDepotIds']);
    mockParameterService = jasmine.createSpyObj('ParameterService', ['search']);
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    mockAuthService.getSVCProvider.and.returnValue('1');
    mockAuthService.hasAccess.and.returnValue(true);
    mockCommonService.getDepotIds.and.returnValue(['1', '2']);
    mockFileImportExportService.getDepotService.and.returnValue(of(DummyData.depot_list));
    mockFileImportExportService.manage.and.returnValue(of({
      status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK',
      payload: { parameter_file_data: DummyData.parameter_file_data, records_count: DummyData.parameter_file_data.length },
    }));

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
      providers: [
        { provide: FileImportExportService, useValue: mockFileImportExportService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: DepoService, useValue: mockDepoService },
        { provide: FilterService, useValue: mockFilterService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CommonService, useValue: mockCommonService },
        { provide: ParameterService, useValue: mockParameterService },
        { provide: Store, useValue: mockStore },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParameterFileImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should call loadFilterValues on init', () => {
    spyOn(component, 'loadFilterValues').and.callThrough();
    component.ngOnInit();
    expect(component.loadFilterValues).toHaveBeenCalled();
  });

  it('should load depots and filter values from the service', () => {
    component.loadFilterValues();
    expect(component.depots).toBeTruthy();
    expect(component.filterConfigs.length).toBe(2);
  });

  it('should open a dialog when openView is called', () => {
    component.openView();
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
