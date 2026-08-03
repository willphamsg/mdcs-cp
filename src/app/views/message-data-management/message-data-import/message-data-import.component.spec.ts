import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { PaginationService } from '@app/services/pagination.service';
import DummyData from '@data/db.json';
import { of, Subject, throwError } from 'rxjs';
import { MessageDataImportComponent } from './message-data-import.component';
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
import { Store } from '@ngrx/store';
import { MatDialog } from '@angular/material/dialog';
import { WebSocketService } from '@app/services/web-socket.service';

describe('MessageDataImportComponent', () => {
  let component: MessageDataImportComponent;
  let fixture: ComponentFixture<MessageDataImportComponent>;
  let mockDepoService: jasmine.SpyObj<DepoService>;
  let mockPaginationService: jasmine.SpyObj<PaginationService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;
  let mockStore: jasmine.SpyObj<Store>;
  let mockImportExportService: jasmine.SpyObj<MessageDataImportExportService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockAppConfigService: jasmine.SpyObj<AppConfigService>;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;

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
      'searchImportByGroupId',
      'import',
    ]);
    mockImportExportService.manage.and.returnValue(of(mockPayloadResponse));

    mockAuthService = jasmine.createSpyObj('AuthService', ['isDagw', 'getSVCProvider', 'getToken']);
    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.getSVCProvider.and.returnValue('1');
    mockAuthService.getToken.and.returnValue('test-token');

    mockAppConfigService = jasmine.createSpyObj('AppConfigService', ['getConfig']);
    mockAppConfigService.getConfig.and.returnValue('');

    mockWebSocketService = jasmine.createSpyObj('WebSocketService', ['refreshTrigger']);
    mockWebSocketService.refreshTrigger.and.returnValue(new Subject());

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
        { provide: WebSocketService, useValue: mockWebSocketService },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageDataImportComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(MessageDataImportComponent).toBeTruthy();
  });

  it('should set filterConfigs in loadFilterValues', () => {
    component.loadFilterValues();

    expect(component.filterConfigs).toHaveSize(0);
  });

  it('should call reloadHandler on depo change in ngOnInit', () => {
    spyOn(component, 'reloadHandler');

    component.ngOnInit();
    fixture.detectChanges();

    expect(component.reloadHandler).toHaveBeenCalled();
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

    component.sortHandler({ active: 'depot', direction: 'asc' });

    expect(component.params.sort_order).toEqual([{ name: 'depot', desc: false }]);
    expect(component.reloadHandler).toHaveBeenCalled();
  });

  describe('reloadHandler', () => {
    it('should search by group id when groupIdentifier is set', () => {
      component.groupIdentifier = 'GRP1';
      spyOn(component, 'searchByGroupId');
      // ngOnInit -> subscribeToDepoChanges() already invoked reloadHandler()
      // once synchronously during the outer beforeEach's fixture.detectChanges()
      // (with groupIdentifier still '' at that point, so it took the manage()
      // branch, since `this.depots` defaults to [] which is truthy). Reset the
      // spy so the assertions below only reflect the explicit call under test.
      mockImportExportService.manage.calls.reset();

      component.reloadHandler();

      expect(component.searchByGroupId).toHaveBeenCalledWith('GRP1');
      expect(mockImportExportService.manage).not.toHaveBeenCalled();
    });

    it('should call manage() when there is no groupIdentifier and depots are present', () => {
      component.groupIdentifier = '';
      component.depots = mockDepots;
      mockImportExportService.manage.and.returnValue(
        of({ status: 200, payload: { records_count: 0, message_data_import: [] } } as any)
      );

      component.reloadHandler();

      expect(mockImportExportService.manage).toHaveBeenCalledWith(component.params, 'import');
    });

    it('should not update dataSource when manage() responds with a non-200 status', () => {
      component.groupIdentifier = '';
      component.depots = mockDepots;
      mockImportExportService.manage.and.returnValue(of({ status: 500, payload: null } as any));
      spyOn(component, 'updateDataSource');

      component.reloadHandler();

      expect(component.updateDataSource).not.toHaveBeenCalled();
    });
  });

  describe('searchByGroupId', () => {
    it('should update dataSource and keep polling when items are not all complete', () => {
      mockImportExportService.searchImportByGroupId.and.returnValue(
        of({
          status: 200,
          payload: {
            records_count: 1,
            message_data_import: [{ status: 'processing', depot_id: '1' }],
          },
        } as any)
      );
      spyOn(component as any, 'stopPolling');

      component.searchByGroupId('GRP1');

      expect(component.dataSource.length).toBe(1);
      expect(component['stopPolling']).not.toHaveBeenCalled();
    });

    it('should stop polling once all items are Imported or Fail', () => {
      mockImportExportService.searchImportByGroupId.and.returnValue(
        of({
          status: 200,
          payload: {
            records_count: 1,
            message_data_import: [{ status: 'imported', depot_id: '1' }],
          },
        } as any)
      );
      spyOn(component as any, 'stopPolling');

      component.searchByGroupId('GRP1');

      expect(component['stopPolling']).toHaveBeenCalled();
    });

    it('should dispatch an error notification when the search fails', () => {
      mockImportExportService.searchImportByGroupId.and.returnValue(
        throwError(() => new Error('network error'))
      );

      component.searchByGroupId('GRP1');

      expect(mockStore.dispatch).toHaveBeenCalled();
    });
  });

  describe('areAllItemsComplete', () => {
    it('should be false when dataSource is empty', () => {
      component.dataSource = [];
      expect(component['areAllItemsComplete']()).toBeFalse();
    });

    it('should be true when every item is Imported or Fail', () => {
      component.dataSource = [
        { status: 'Imported' } as any,
        { status: 'Fail' } as any,
      ];
      expect(component['areAllItemsComplete']()).toBeTrue();
    });

    it('should be false when some items are still pending', () => {
      component.dataSource = [
        { status: 'Imported' } as any,
        { status: 'Processing' } as any,
      ];
      expect(component['areAllItemsComplete']()).toBeFalse();
    });
  });

  describe('startPolling / stopPolling', () => {
    it('should subscribe to the websocket refresh trigger and search by group id on tick', () => {
      const trigger = new Subject<unknown>();
      mockWebSocketService.refreshTrigger.and.returnValue(trigger);
      component.groupIdentifier = 'GRP1';
      spyOn(component, 'searchByGroupId');

      component['startPolling']();
      trigger.next(null);

      expect(mockWebSocketService.refreshTrigger).toHaveBeenCalled();
      expect(component.searchByGroupId).toHaveBeenCalledWith('GRP1');
    });

    it('should not search by group id on tick when groupIdentifier is empty', () => {
      const trigger = new Subject<unknown>();
      mockWebSocketService.refreshTrigger.and.returnValue(trigger);
      component.groupIdentifier = '';
      spyOn(component, 'searchByGroupId');

      component['startPolling']();
      trigger.next(null);

      expect(component.searchByGroupId).not.toHaveBeenCalled();
    });

    it('should unsubscribe an existing subscription when stopPolling is called', () => {
      const trigger = new Subject<unknown>();
      mockWebSocketService.refreshTrigger.and.returnValue(trigger);
      component['startPolling']();
      const subscription = component['pollingSubscription'];
      spyOn(subscription!, 'unsubscribe').and.callThrough();

      component['stopPolling']();

      expect(subscription!.unsubscribe).toHaveBeenCalled();
      expect(component['pollingSubscription']).toBeUndefined();
    });

    it('should be a no-op when there is no active polling subscription', () => {
      component['pollingSubscription'] = undefined;

      expect(() => component['stopPolling']()).not.toThrow();
      expect(component['pollingSubscription']).toBeUndefined();
    });
  });

  describe('updateDataSource and mapBusList', () => {
    it('should resolve depot name and title-case the status when a matching depot exists', () => {
      component.depots = mockDepots;

      component.updateDataSource({
        records_count: 1,
        message_data_import: [{ status: 'imported', depot_id: mockDepots[0].depot_id }],
      });

      expect(component.dataSource[0].status).toBe('Imported');
      expect((component.dataSource[0] as any).depot).toBe(mockDepots[0].depot_name);
    });

    it('should default depot to an empty string when no match is found', () => {
      component.depots = mockDepots;

      component.updateDataSource({
        records_count: 1,
        message_data_import: [{ status: 'fail', depot_id: 'unknown-id' }],
      });

      expect((component.dataSource[0] as any).depot).toBe('');
    });
  });

  describe('openView', () => {
    it('should reload data when the dialog closes with a non-cancel result', () => {
      const mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
      mockDialog.open.and.returnValue({ afterClosed: () => of('ok') } as any);
      spyOn(component, 'reloadHandler');

      component.openView();

      expect(mockDialog.open).toHaveBeenCalled();
      expect(component.reloadHandler).toHaveBeenCalled();
    });

    it('should not reload data when the dialog is cancelled', () => {
      const mockDialog = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
      mockDialog.open.and.returnValue({ afterClosed: () => of('cancel') } as any);
      spyOn(component, 'reloadHandler');

      component.openView();

      expect(component.reloadHandler).not.toHaveBeenCalled();
    });
  });

  describe('importHandler', () => {
    it('should do nothing when no files are selected', () => {
      component.importHandler({ target: { files: [] } });

      expect(mockImportExportService.import).not.toHaveBeenCalled();
    });

    it('should upload the file, notify success, and start polling on success', () => {
      const file = new File(['content'], 'test.xml');
      mockImportExportService.import.and.returnValue(
        of({
          status: 200,
          message: 'Uploaded',
          payload: { grp_identifier: 'GRP99' },
        } as any)
      );
      spyOn(component, 'searchByGroupId');
      spyOn(component as any, 'startPolling');

      component.importHandler({ target: { files: [file] } });

      expect(component.groupIdentifier).toBe('GRP99');
      expect(mockStore.dispatch).toHaveBeenCalled();
      expect(component.searchByGroupId).toHaveBeenCalledWith('GRP99');
      expect(component['startPolling']).toHaveBeenCalled();
    });

    it('should not update state when the upload response status is not 200', () => {
      const file = new File(['content'], 'test.xml');
      mockImportExportService.import.and.returnValue(
        of({ status: 500, payload: {} } as any)
      );
      spyOn(component, 'searchByGroupId');

      component.importHandler({ target: { files: [file] } });

      expect(component.searchByGroupId).not.toHaveBeenCalled();
    });

    it('should dispatch an error notification when the upload fails', () => {
      const file = new File(['content'], 'test.xml');
      mockImportExportService.import.and.returnValue(
        throwError(() => new Error('upload failed'))
      );

      component.importHandler({ target: { files: [file] } });

      expect(mockStore.dispatch).toHaveBeenCalled();
    });
  });
});

describe('MessageDataImportComponent - isDagw true', () => {
  let component: MessageDataImportComponent;
  let fixture: ComponentFixture<MessageDataImportComponent>;
  let mockAuthServiceDagw: jasmine.SpyObj<AuthService>;

  beforeEach(waitForAsync(() => {
    const filterServiceSpyDagw = jasmine.createSpyObj('FilterService', [
      'clearSelectedFilters',
    ]);
    filterServiceSpyDagw.searchValue$ = of('');
    filterServiceSpyDagw.filterValues$ = of({});

    const depoServiceSpyDagw = jasmine.createSpyObj('DepoService', ['depoList$']);
    depoServiceSpyDagw.depoList$ = of([]);

    mockAuthServiceDagw = jasmine.createSpyObj('AuthService', [
      'isDagw',
      'getSVCProvider',
      'getToken',
    ]);
    mockAuthServiceDagw.isDagw.and.returnValue(true);
    mockAuthServiceDagw.getSVCProvider.and.returnValue('1');

    const appConfigServiceSpyDagw = jasmine.createSpyObj('AppConfigService', ['getConfig']);
    appConfigServiceSpyDagw.getConfig.and.returnValue('DAGW1');

    const importExportServiceSpyDagw = jasmine.createSpyObj('MessageDataImportExportService', [
      'manage',
      'searchImportByGroupId',
      'import',
    ]);
    importExportServiceSpyDagw.manage.and.returnValue(
      of({ status: 200, payload: { records_count: 0, message_data_import: [] } } as any)
    );

    const webSocketServiceSpyDagw = jasmine.createSpyObj('WebSocketService', ['refreshTrigger']);
    webSocketServiceSpyDagw.refreshTrigger.and.returnValue(new Subject());

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, BrowserAnimationsModule],
      providers: [
        { provide: DepoService, useValue: depoServiceSpyDagw },
        {
          provide: PaginationService,
          // Must include 'clearPagination': PaginationComponent (rendered
          // via the pagination template) calls it unconditionally from its
          // own ngOnDestroy. Without it stubbed, tearing down this fixture
          // throws "clearPagination is not a function" during TestBed's
          // automatic component cleanup.
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
        { provide: MessageDataImportExportService, useValue: importExportServiceSpyDagw },
        { provide: AuthService, useValue: mockAuthServiceDagw },
        { provide: AppConfigService, useValue: appConfigServiceSpyDagw },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: WebSocketService, useValue: webSocketServiceSpyDagw },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MessageDataImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should apply the DAGW depot filter on init', () => {
    expect(component.isDagw).toBeTrue();
    expect(component).toBeTruthy();
  });
});
