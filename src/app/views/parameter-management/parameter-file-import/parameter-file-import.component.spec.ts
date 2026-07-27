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
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';

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
    expect(component.filterConfigs).toHaveSize(2);
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

  it('should return the configured chk value for a known column via hiddenHandler', () => {
    expect(component.hiddenHandler('file_id')).toBe(true);
    expect(component.hiddenHandler('param_filename')).toBe(false);
  });

  describe('importHandler', () => {
    it('should dispatch an error snackbar and skip the confirmation dialog when a non-zip file is selected', () => {
      const invalidFile = new File(['content'], 'notes.txt', {
        type: 'text/plain',
      });
      const event = {
        target: { files: [invalidFile] },
      } as unknown as Event;

      mockDialog.open.calls.reset();
      mockStore.dispatch.calls.reset();
      const fakeInput = { value: 'notes.txt' };
      component.fileInputRef = { nativeElement: fakeInput } as any;

      component.importHandler(event);

      expect(mockStore.dispatch).toHaveBeenCalledWith(
        showSnackbar({
          message: 'Only ZIP file is allowed.',
          title: 'Invalid File',
          typeSnackbar: 'error',
        })
      );
      expect(mockDialog.open).not.toHaveBeenCalled();
      expect(fakeInput.value).toBe('');
    });

    it('should submit the selected files as FormData and handle a successful import response when confirmed', () => {
      const zipFile = new File(['zip-content'], 'params.zip', {
        type: 'application/zip',
      });
      const event = {
        target: { files: [zipFile] },
      } as unknown as Event;

      mockDialog.open.and.returnValue({
        afterClosed: () => of(true),
      } as any);
      mockFileImportExportService.import.and.returnValue(
        of({
          status: 201,
          status_code: 'SUCCESS',
          timestamp: Date.now(),
          message: 'Import started',
          payload: {
            param_import_files: [
              { grp_identifier_id: 'GRP-1' },
              { grp_identifier_id: '' },
            ],
          },
        })
      );
      mockStore.dispatch.calls.reset();
      spyOn(component, 'reloadHandler').and.callThrough();

      component.importHandler(event);

      expect(mockFileImportExportService.import).toHaveBeenCalled();
      const formDataArg = mockFileImportExportService.import.calls
        .mostRecent().args[0] as FormData;
      expect(formDataArg.getAll('file')).toEqual([zipFile]);
      expect(mockStore.dispatch).toHaveBeenCalledWith(
        showSnackbar({
          message: 'Import started',
          title: 'Success',
          typeSnackbar: 'success',
        })
      );
      expect(component.currentPage).toBe(1);
      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('should clear the file input without importing when the confirmation dialog is dismissed', () => {
      const zipFile = new File(['zip-content'], 'params.zip', {
        type: 'application/zip',
      });
      const event = {
        target: { files: [zipFile] },
      } as unknown as Event;

      mockDialog.open.and.returnValue({
        afterClosed: () => of(false),
      } as any);
      mockFileImportExportService.import.calls.reset();
      const fakeInput = { value: 'params.zip' };
      component.fileInputRef = { nativeElement: fakeInput } as any;

      component.importHandler(event);

      expect(mockFileImportExportService.import).not.toHaveBeenCalled();
      expect(fakeInput.value).toBe('');
    });
  });
});
