import {
  ComponentFixture,
  TestBed,
  waitForAsync,
} from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { PaginationService } from '@app/services/pagination.service';
import DummyData from '@data/db.json';
import { Store } from '@ngrx/store';
import { of, Subject, throwError } from 'rxjs';
import { MessageDataExportComponent } from './message-data-export.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DepoService } from '@app/services/depo.service';
import { MessageService } from '@app/services/message.service';
import { CommonService } from '@app/services/common.service';
import { PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FilterService } from '@app/services/filter.service';
import { MessageDataImportExportService } from '@app/services/message-data-import-export.service';
import { AuthService } from '@app/services/auth.service';
import { AppConfigService } from '@app/services/app-config.service';
import { environment } from '@env/environment';

describe('MessageDataExportComponent', () => {
  let component: MessageDataExportComponent;
  let fixture: ComponentFixture<MessageDataExportComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockImportExportService: jasmine.SpyObj<MessageDataImportExportService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockAppConfigService: jasmine.SpyObj<AppConfigService>;

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: DummyData,
  };

  const mockDepots: IDepoList[] = DummyData.depot_list;

  const filterServiceSpy = jasmine.createSpyObj('FilterService', [
    'getSelectedFilters',
    'updateFormGroup',
    'clearSelectedFilters',
  ]);

  mockDepoService = jasmine.createSpyObj('DepoService', ['depoList$']);
  mockCommonService = jasmine.createSpyObj('CommonService', ['search']);
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

  beforeEach(waitForAsync(() => {
    filterServiceSpy.searchValue$ = of('test');
    filterServiceSpy.filterValues$ = of({ test: ['1'] });
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);
    mockDepoService.depoList$ = of(mockDepots);
    mockMessageService.MessageResponse.and.returnValue(true);
    mockCommonService.search.and.returnValue(of(mockPayloadResponse));

    mockImportExportService = jasmine.createSpyObj('MessageDataImportExportService', [
      'manage',
      'resumeMessageExportPolling',
      'getMessageExportProcessSnapshot',
      'clearMessageExportProcessState',
      'startMessageExportPolling',
      'sendMessageExportRequest',
      'export',
      'clearCompletedMessageExportProcessState',
    ]);
    mockImportExportService.messageExportProcess$ = of({ isExportInProgress: false }) as any;
    mockImportExportService.resumeMessageExportPolling.and.returnValue(undefined);
    mockImportExportService.getMessageExportProcessSnapshot.and.returnValue({
      isExportInProgress: false,
      dateSelected: null,
      payload: null,
      timedOut: false,
      success: false,
      startedAt: null,
    } as any);
    mockImportExportService.manage.and.returnValue(of(mockPayloadResponse));

    mockAuthService = jasmine.createSpyObj('AuthService', ['isDagw', 'getSVCProvider', 'getToken']);
    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.getSVCProvider.and.returnValue('1');
    mockAuthService.getToken.and.returnValue('test-token');

    mockAppConfigService = jasmine.createSpyObj('AppConfigService', ['getConfig']);
    mockAppConfigService.getConfig.and.returnValue('');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: mockDepoService },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: FilterService, useValue: filterServiceSpy },
        { provide: CommonService, useValue: mockCommonService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: Store, useValue: mockStore },
        { provide: MessageDataImportExportService, useValue: mockImportExportService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AppConfigService, useValue: mockAppConfigService },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
      ],
    }).compileComponents();

    mockStore = TestBed.inject(Store) as jasmine.SpyObj<Store>;
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageDataExportComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(MessageDataExportComponent).toBeTruthy();
  });

  it('should set filterConfigs in loadFilterValues', () => {
    component.loadFilterValues();

    expect(component.filterConfigs).toHaveSize(1);
    expect(component.filterConfigs[0].controlName).toBe('mdcsAccess');
  });

  it('should load depots on depo change', () => {
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.depots).toEqual(mockDepots);
  });

  it('should call pagination service on page change', () => {
    component.onPageChange({ page: 1, pageSize: 10 });

    expect(mockPaginationService.handlePageEvent).toHaveBeenCalled();
    expect(component.params.page_index).toBe(0);
    expect(component.params.page_size).toBe(10);
  });

  it('should call clearSelectedFilters on tabChange', () => {
    spyOn(component, 'reloadHandler');
    component.onTabChange();

    expect(filterServiceSpy.clearSelectedFilters).toHaveBeenCalled();
    expect(component.reloadHandler).toHaveBeenCalled();
  });

  it('should unsubscribe from observables', () => {
    spyOn(component['destroy$'], 'next').and.callThrough();
    spyOn(component['destroy$'], 'complete').and.callThrough();

    component.ngOnDestroy();

    expect(component['destroy$'].next).toHaveBeenCalled();
    expect(component['destroy$'].complete).toHaveBeenCalled();
  });

  it('should set sort_order via sortHandler and reload', () => {
    spyOn(component, 'reloadHandler');

    component.sortHandler({ active: 'depot', direction: 'desc' });

    expect(component.params.sort_order).toEqual([{ name: 'depot', desc: true }]);
    expect(component.reloadHandler).toHaveBeenCalled();
  });

  it('should return the chk flag for a known header field via hiddenHandler', () => {
    const field = component.headerData[0].field;
    expect(component.hiddenHandler(field)).toBe(component.headerData[0].chk);
  });

  describe('subscribeToDepoChanges', () => {
    it('should default mdcsAccess to an empty array when filterValue is falsy', () => {
      const depotSubject = new Subject<any>();
      const searchSubject = new Subject<any>();
      const filterSubject = new Subject<any>();
      mockDepoService.depoList$ = depotSubject.asObservable();
      filterServiceSpy.searchValue$ = searchSubject.asObservable();
      filterServiceSpy.filterValues$ = filterSubject.asObservable();

      component.subscribeToDepoChanges();

      depotSubject.next(mockDepots);
      searchSubject.next('abc');
      filterSubject.next(null);

      expect(component.params.search_text).toBe('abc');
      expect(component.depots).toEqual(mockDepots);
      expect(component.params.search_select_filter['mdcsAccess']).toEqual([]);
    });

    it('should use the mdcsAccess values provided on the filterValue', () => {
      const depotSubject = new Subject<any>();
      const searchSubject = new Subject<any>();
      const filterSubject = new Subject<any>();
      mockDepoService.depoList$ = depotSubject.asObservable();
      filterServiceSpy.searchValue$ = searchSubject.asObservable();
      filterServiceSpy.filterValues$ = filterSubject.asObservable();

      component.subscribeToDepoChanges();

      depotSubject.next(mockDepots);
      searchSubject.next('abc');
      filterSubject.next({ mdcsAccess: ['1'] });

      expect(component.params.search_select_filter['mdcsAccess']).toEqual(['1']);
    });
  });

  describe('applyExportProcessState (via subscribeToExportProcess)', () => {
    let processSubject: Subject<any>;

    beforeEach(() => {
      processSubject = new Subject<any>();
      mockImportExportService.messageExportProcess$ = processSubject.asObservable();
      component.subscribeToExportProcess();
    });

    it('should update isExportInProgress and dateSelected when provided', () => {
      processSubject.next({
        isExportInProgress: true,
        dateSelected: '2024-01-01',
        payload: null,
        timedOut: false,
        success: false,
        startedAt: null,
      });

      expect(component.isExportInProgress).toBeTrue();
      expect(component.dateSelected).toBe('2024-01-01');
    });

    it('should not overwrite dateSelected when state.dateSelected is falsy', () => {
      component.dateSelected = 'existing-date';

      processSubject.next({
        isExportInProgress: false,
        dateSelected: '',
        payload: null,
        timedOut: false,
        success: false,
        startedAt: null,
      });

      expect(component.dateSelected).toBe('existing-date');
    });

    it('should update dataSource when state.payload is present', () => {
      processSubject.next({
        isExportInProgress: false,
        dateSelected: '',
        payload: {
          message_data_file_export: [{ data_file_name: 'f.zip', depot_id: '1' }],
          records_count: 1,
        },
        timedOut: false,
        success: false,
        startedAt: null,
      });

      expect(component.dataSource.length).toBe(1);
      expect(component.rowCount).toBe(1);
    });

    it('should leave dataSource untouched when state.payload is absent', () => {
      component.dataSource = [{ message_data_filename: 'existing' } as any];

      processSubject.next({
        isExportInProgress: false,
        dateSelected: '',
        payload: null,
        timedOut: false,
        success: false,
        startedAt: null,
      });

      expect(component.dataSource.length).toBe(1);
    });

    it('should dispatch a timeout warning when state.timedOut is true', () => {
      processSubject.next({
        isExportInProgress: false,
        dateSelected: '',
        payload: null,
        timedOut: true,
        success: false,
        startedAt: 111,
      });

      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should not dispatch a duplicate timeout warning for the same startedAt', () => {
      processSubject.next({
        isExportInProgress: false,
        dateSelected: '',
        payload: null,
        timedOut: true,
        success: false,
        startedAt: 222,
      });
      mockStore.dispatch.calls.reset();

      processSubject.next({
        isExportInProgress: false,
        dateSelected: '',
        payload: null,
        timedOut: true,
        success: false,
        startedAt: 222,
      });

      expect(mockStore.dispatch).not.toHaveBeenCalled();
    });

    it('should dispatch again for a timeout with no startedAt (no dedup key)', () => {
      processSubject.next({
        isExportInProgress: false,
        dateSelected: '',
        payload: null,
        timedOut: true,
        success: false,
        startedAt: null,
      });
      mockStore.dispatch.calls.reset();

      processSubject.next({
        isExportInProgress: false,
        dateSelected: '',
        payload: null,
        timedOut: true,
        success: false,
        startedAt: null,
      });

      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should open the export ready dialog when success and payload are present', () => {
      const dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
      dialog.open.and.returnValue({ afterClosed: () => of('cancel') } as any);

      processSubject.next({
        isExportInProgress: false,
        dateSelected: '',
        payload: { message_data_file_export: [], records_count: 0 },
        timedOut: false,
        success: true,
        startedAt: 333,
      });

      expect(dialog.open).toHaveBeenCalled();
      expect(mockImportExportService.clearCompletedMessageExportProcessState).toHaveBeenCalled();
    });

    it('should not reopen the dialog when it is already open for the same startedAt', () => {
      const dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
      dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);

      processSubject.next({
        isExportInProgress: false,
        dateSelected: '',
        payload: { message_data_file_export: [], records_count: 0 },
        timedOut: false,
        success: true,
        startedAt: 444,
      });
      dialog.open.calls.reset();

      processSubject.next({
        isExportInProgress: false,
        dateSelected: '',
        payload: { message_data_file_export: [], records_count: 0 },
        timedOut: false,
        success: true,
        startedAt: 444,
      });

      expect(dialog.open).not.toHaveBeenCalled();
    });

    it('should call downloadExportZip when the dialog closes with a download result', () => {
      const dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
      dialog.open.and.returnValue({ afterClosed: () => of('download') } as any);
      mockImportExportService.export.and.returnValue(of(new Blob(['x'])));
      spyOn(component as any, 'downloadFile');

      processSubject.next({
        isExportInProgress: false,
        dateSelected: '',
        payload: {
          message_data_file_export: [{ data_file_name: 'a', depot_id: '1' }],
          records_count: 1,
        },
        timedOut: false,
        success: true,
        startedAt: 555,
      });

      expect(mockImportExportService.export).toHaveBeenCalled();
    });

    it('should not call downloadExportZip for non-download dialog results', () => {
      const dialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
      dialog.open.and.returnValue({ afterClosed: () => of('cancel') } as any);

      processSubject.next({
        isExportInProgress: false,
        dateSelected: '',
        payload: {
          message_data_file_export: [{ data_file_name: 'a', depot_id: '1' }],
          records_count: 1,
        },
        timedOut: false,
        success: true,
        startedAt: 666,
      });

      expect(mockImportExportService.export).not.toHaveBeenCalled();
    });
  });

  describe('reloadHandler', () => {
    it('should update dataSource from the in-progress snapshot payload and skip manage()', () => {
      mockImportExportService.getMessageExportProcessSnapshot.and.returnValue({
        isExportInProgress: true,
        payload: {
          message_data_file_export: [{ data_file_name: 'a', depot_id: '1' }],
          records_count: 1,
        },
      } as any);

      component.reloadHandler();

      expect(component.dataSource.length).toBe(1);
      expect(mockImportExportService.manage).not.toHaveBeenCalled();
    });

    it('should return early when in progress but no snapshot payload exists', () => {
      mockImportExportService.getMessageExportProcessSnapshot.and.returnValue({
        isExportInProgress: true,
        payload: null,
      } as any);

      component.reloadHandler();

      expect(mockImportExportService.manage).not.toHaveBeenCalled();
    });

    it('should fetch fresh data via manage() when not in progress', () => {
      mockImportExportService.getMessageExportProcessSnapshot.and.returnValue({
        isExportInProgress: false,
        payload: null,
      } as any);
      mockImportExportService.manage.and.returnValue(
        of({ status: 200, payload: { message_data_file_export: [], records_count: 0 } } as any)
      );

      component.reloadHandler();

      expect(mockImportExportService.manage).toHaveBeenCalled();
    });

    it('should not update dataSource when manage() responds with a non-200 status', () => {
      mockImportExportService.getMessageExportProcessSnapshot.and.returnValue({
        isExportInProgress: false,
        payload: null,
      } as any);
      mockImportExportService.manage.and.returnValue(of({ status: 500, payload: null } as any));
      spyOn(component, 'updateDataSource');

      component.reloadHandler();

      expect(component.updateDataSource).not.toHaveBeenCalled();
    });
  });

  describe('updateDataSource and mapData', () => {
    it('should default to an empty dataSource when message_data_file_export is missing', () => {
      component.updateDataSource({});

      expect(component.dataSource).toEqual([]);
      expect(component.rowCount).toBe(0);
    });

    it('should derive rowCount from list length when records_count is absent', () => {
      component.updateDataSource({
        message_data_file_export: [{ data_file_name: 'a', depot_id: '1' }],
      });

      expect(component.rowCount).toBe(1);
    });

    it('should resolve the depot name when a matching depot exists', () => {
      component.depots = mockDepots;

      component.updateDataSource({
        message_data_file_export: [
          { data_file_name: 'a', depot_id: mockDepots[0].depot_id },
        ],
      });

      expect((component.dataSource[0] as any).depot).toBe(mockDepots[0].depot_name);
    });

    it('should default depot to an empty string when no match is found', () => {
      component.depots = mockDepots;

      component.updateDataSource({
        message_data_file_export: [{ data_file_name: 'a', depot_id: 'unknown-id' }],
      });

      expect((component.dataSource[0] as any).depot).toBe('');
    });
  });

  describe('downloadHandler', () => {
    it('should dispatch a warning and skip the request when no date is selected', () => {
      component.dateSelected = '';

      component.downloadHandler();

      expect(mockStore.dispatch).toHaveBeenCalled();
      expect(mockImportExportService.sendMessageExportRequest).not.toHaveBeenCalled();
    });

    it('should fail the request when the response status is not 200', () => {
      component.dateSelected = '2024-01-01';
      mockImportExportService.sendMessageExportRequest.and.returnValue(
        of({ status: 500, payload: {} } as any)
      );
      spyOn(component as any, 'handleExportRequestFailed');

      component.downloadHandler();

      expect(component['handleExportRequestFailed']).toHaveBeenCalledWith(
        'Failed to create message export request.'
      );
      expect(mockImportExportService.startMessageExportPolling).not.toHaveBeenCalled();
    });

    it('should fail the request when grpIdentifierId is missing', () => {
      component.dateSelected = '2024-01-01';
      mockImportExportService.sendMessageExportRequest.and.returnValue(
        of({
          status: 200,
          payload: { message_data_export: { service_provider_id: 1 } },
        } as any)
      );
      spyOn(component as any, 'handleExportRequestFailed');

      component.downloadHandler();

      expect(component['handleExportRequestFailed']).toHaveBeenCalled();
    });

    it('should fail the request when serviceProviderId is null', () => {
      component.dateSelected = '2024-01-01';
      mockImportExportService.sendMessageExportRequest.and.returnValue(
        of({
          status: 200,
          payload: {
            message_data_export: { grp_identifier_id: 'G1', service_provider_id: null },
          },
        } as any)
      );
      spyOn(component as any, 'handleExportRequestFailed');

      component.downloadHandler();

      expect(component['handleExportRequestFailed']).toHaveBeenCalled();
    });

    it('should start polling when the export request succeeds', () => {
      component.dateSelected = '2024-01-01';
      mockImportExportService.sendMessageExportRequest.and.returnValue(
        of({
          status: 200,
          payload: {
            message_data_export: { grp_identifier_id: 'G1', service_provider_id: 5 },
          },
        } as any)
      );

      component.downloadHandler();

      expect(mockImportExportService.startMessageExportPolling).toHaveBeenCalledWith(
        jasmine.any(String),
        'G1',
        5
      );
    });

    it('should fail the request when sendMessageExportRequest errors', () => {
      component.dateSelected = '2024-01-01';
      mockImportExportService.sendMessageExportRequest.and.returnValue(
        throwError(() => new Error('boom'))
      );
      spyOn(component as any, 'handleExportRequestFailed');

      component.downloadHandler();

      expect(component['handleExportRequestFailed']).toHaveBeenCalledWith(
        'Failed to create message export request.'
      );
    });
  });

  describe('downloadExportZip', () => {
    it('should dispatch a warning and skip the request when there is no data', () => {
      component.dataSource = [];

      component['downloadExportZip']();

      expect(mockStore.dispatch).toHaveBeenCalled();
      expect(mockImportExportService.export).not.toHaveBeenCalled();
    });

    it('should dispatch an error when the response blob is empty', () => {
      component.dataSource = [{ message_data_filename: 'f' } as any];
      mockImportExportService.export.and.returnValue(of(new Blob([])));

      component['downloadExportZip']();

      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should trigger the download when the response has content', () => {
      component.dataSource = [{ message_data_filename: 'f' } as any];
      mockImportExportService.export.and.returnValue(of(new Blob(['data'])));
      spyOn(component as any, 'downloadFile');

      component['downloadExportZip']();

      expect(component['downloadFile']).toHaveBeenCalled();
    });

    it('should map a network error (status 0) to a friendly message', () => {
      component.dataSource = [{ message_data_filename: 'f' } as any];
      mockImportExportService.export.and.returnValue(throwError(() => ({ status: 0 })));

      component['downloadExportZip']();

      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should map a 404 error to a friendly message', () => {
      component.dataSource = [{ message_data_filename: 'f' } as any];
      mockImportExportService.export.and.returnValue(throwError(() => ({ status: 404 })));

      component['downloadExportZip']();

      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should map a 500 error to a friendly message', () => {
      component.dataSource = [{ message_data_filename: 'f' } as any];
      mockImportExportService.export.and.returnValue(throwError(() => ({ status: 500 })));

      component['downloadExportZip']();

      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should use error.message when the status is unrecognized', () => {
      component.dataSource = [{ message_data_filename: 'f' } as any];
      mockImportExportService.export.and.returnValue(
        throwError(() => ({ status: 999, message: 'custom failure' }))
      );

      component['downloadExportZip']();

      expect(mockStore.dispatch).toHaveBeenCalled();
    });

    it('should fall back to Unknown error when neither status nor message match', () => {
      component.dataSource = [{ message_data_filename: 'f' } as any];
      mockImportExportService.export.and.returnValue(throwError(() => ({})));

      component['downloadExportZip']();

      expect(mockStore.dispatch).toHaveBeenCalled();
    });
  });

  describe('downloadFile', () => {
    it('should create a temporary link, click it, and dispatch a success message', () => {
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:url');
      spyOn(window.URL, 'revokeObjectURL');
      const anchor = document.createElement('a');
      spyOn(anchor, 'click');
      spyOn(document, 'createElement').and.returnValue(anchor);

      component['downloadFile'](new Blob(['x']), 'file.zip');

      expect(anchor.click).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();
      expect(mockStore.dispatch).toHaveBeenCalled();
    });
  });

  describe('handleExportRequestFailed', () => {
    it('should reset export state and dispatch an error message', () => {
      component.isExportInProgress = true;

      component['handleExportRequestFailed']('custom message');

      expect(mockImportExportService.clearMessageExportProcessState).toHaveBeenCalled();
      expect(component.isExportInProgress).toBeFalse();
      expect(mockStore.dispatch).toHaveBeenCalled();
    });
  });

  describe('isDummyData', () => {
    // environment.useDummyData is a shared mutable singleton several other
    // spec files toggle without a guaranteed restore, so this test sets and
    // restores it explicitly rather than assuming its ambient value.
    let originalUseDummyData: boolean;

    beforeEach(() => {
      originalUseDummyData = environment.useDummyData;
    });

    afterEach(() => {
      environment.useDummyData = originalUseDummyData;
    });

    it('should reflect environment.useDummyData', () => {
      environment.useDummyData = false;
      expect(component['isDummyData']()).toBeFalse();

      environment.useDummyData = true;
      expect(component['isDummyData']()).toBeTrue();
    });
  });

  describe('onDateChange', () => {
    it('should not reset data while an export is in progress', () => {
      component.isExportInProgress = true;
      component.dataSource = [{ message_data_filename: 'f' } as any];
      component.rowCount = 5;

      component.onDateChange();

      expect(component.dataSource.length).toBe(1);
      expect(component.rowCount).toBe(5);
    });

    it('should reset data and dialog flag when not exporting', () => {
      component.isExportInProgress = false;
      component.dataSource = [{ message_data_filename: 'f' } as any];
      component.rowCount = 5;
      component['isExportReadyDialogOpen'] = true;

      component.onDateChange();

      expect(component.dataSource).toEqual([]);
      expect(component.rowCount).toBe(0);
      expect(component['isExportReadyDialogOpen']).toBeFalse();
    });
  });
});

describe('MessageDataExportComponent - isDagw true', () => {
  let component: MessageDataExportComponent;
  let fixture: ComponentFixture<MessageDataExportComponent>;
  let mockAuthServiceDagw: jasmine.SpyObj<AuthService>;
  let mockImportExportServiceDagw: jasmine.SpyObj<MessageDataImportExportService>;

  beforeEach(waitForAsync(() => {
    const filterServiceSpyDagw = jasmine.createSpyObj('FilterService', [
      'clearSelectedFilters',
    ]);
    filterServiceSpyDagw.searchValue$ = of('');
    filterServiceSpyDagw.filterValues$ = of({});

    const depoServiceSpyDagw = jasmine.createSpyObj('DepoService', ['depoList$']);
    depoServiceSpyDagw.depoList$ = of([]);

    mockImportExportServiceDagw = jasmine.createSpyObj('MessageDataImportExportService', [
      'manage',
      'resumeMessageExportPolling',
      'getMessageExportProcessSnapshot',
      'clearMessageExportProcessState',
      'startMessageExportPolling',
      'sendMessageExportRequest',
      'export',
      'clearCompletedMessageExportProcessState',
    ]);
    mockImportExportServiceDagw.messageExportProcess$ = of({ isExportInProgress: false }) as any;
    mockImportExportServiceDagw.getMessageExportProcessSnapshot.and.returnValue({
      isExportInProgress: false,
      dateSelected: null,
      payload: null,
      timedOut: false,
      success: false,
      startedAt: null,
    } as any);

    mockAuthServiceDagw = jasmine.createSpyObj('AuthService', [
      'isDagw',
      'getSVCProvider',
      'getToken',
    ]);
    mockAuthServiceDagw.isDagw.and.returnValue(true);
    mockAuthServiceDagw.getSVCProvider.and.returnValue('1');

    const appConfigServiceSpyDagw = jasmine.createSpyObj('AppConfigService', ['getConfig']);
    appConfigServiceSpyDagw.getConfig.and.returnValue('DAGW1');

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: depoServiceSpyDagw },
        {
          provide: PaginationService,
          // Must include 'clearPagination': PaginationComponent (rendered
          // via the breadcrumbs/pagination template) calls it unconditionally
          // from its own ngOnDestroy. Without it stubbed, tearing down this
          // fixture throws "clearPagination is not a function" during
          // TestBed's automatic component cleanup.
          useValue: jasmine.createSpyObj('PaginationService', [
            'handlePageEvent',
            'loadData',
            'paginateData',
            'getTotalPages',
            'clearPagination',
          ]),
        },
        { provide: FilterService, useValue: filterServiceSpyDagw },
        { provide: Store, useValue: jasmine.createSpyObj('Store', ['dispatch']) },
        { provide: MessageDataImportExportService, useValue: mockImportExportServiceDagw },
        { provide: AuthService, useValue: mockAuthServiceDagw },
        { provide: AppConfigService, useValue: appConfigServiceSpyDagw },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageDataExportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should be created with the dagw search filter branch exercised', () => {
    expect(component.isDagw).toBeTrue();
    expect(component).toBeTruthy();
  });
});
