import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of, Subject } from 'rxjs';
import { MessageDataImportExportService } from './message-data-import-export.service';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { AuthService } from './auth.service';
import { WebSocketService } from './web-socket.service';
import { environment } from '@env/environment';
import { IParams, PayloadResponse } from '@app/models/common';
import DummyData from '@data/db.json';

describe('MessageDataImportExportService', () => {
  let service: MessageDataImportExportService;
  let httpMock: HttpTestingController;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockWebSocketService: jasmine.SpyObj<WebSocketService>;

  const testUri = 'http://test/message-data/';

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Success',
    payload: {},
  };

  const mockParams: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: null,
    search_select_filter: {},
  };

  beforeEach(() => {
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', ['setDynamicEndpoint']);
    mockDynamicEndpoint.setDynamicEndpoint.and.returnValue(testUri);
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['getToken']);
    mockAuthService.getToken.and.returnValue('test-token');
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockWebSocketService = jasmine.createSpyObj('WebSocketService', ['refreshTrigger']);
    mockWebSocketService.refreshTrigger.and.returnValue(new Subject());

    TestBed.configureTestingModule({
      providers: [
        MessageDataImportExportService,
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        { provide: MessageService, useValue: mockMessageService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: WebSocketService, useValue: mockWebSocketService },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(MessageDataImportExportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    // Cancel any polling timers/subscriptions started by a test so they
    // don't leak into subsequent tests.
    service.clearMessageExportProcessState();
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call searchImport when manage is called with import type', () => {
    environment.useDummyData = false;

    service.manage(mockParams, 'import').subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${testUri}import/search`);
    expect(req.request.method).toBe('POST');
    req.flush(mockPayloadResponse);
  });

  it('should call searchExport when manage is called with export type', () => {
    environment.useDummyData = false;

    service.manage(mockParams, 'export').subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${testUri}export/search`);
    expect(req.request.method).toBe('POST');
    req.flush(mockPayloadResponse);
  });

  it('should return dummy data from searchImport when useDummyData is true', () => {
    environment.useDummyData = true;

    service.searchImport(mockParams).subscribe(response => {
      expect(response.status).toBe(200);
      expect(response.status_code).toBe('SUCCESS');
    });
  });

  it('should return dummy data from searchExport when useDummyData is true', () => {
    environment.useDummyData = true;

    service.searchExport(mockParams).subscribe(response => {
      expect(response.status).toBe(200);
      expect(response.status_code).toBe('SUCCESS');
    });
  });

  it('should call searchImportByGroupId', () => {
    environment.useDummyData = false;

    service.searchImportByGroupId('test-grp-id').subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${testUri}import/search`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ grp_identifier: 'test-grp-id' });
    req.flush(mockPayloadResponse);
  });

  it('should return dummy data from searchImportByGroupId when useDummyData is true', () => {
    environment.useDummyData = true;

    service.searchImportByGroupId('test-grp-id').subscribe(response => {
      expect(response.status).toBe(200);
      expect(response.status_code).toBe('INFO 2020');
    });
  });

  it('should return dummy data from getImportedList when useDummyData is true', () => {
    environment.useDummyData = true;

    service.getImportedList().subscribe(response => {
      expect(response).toEqual(DummyData.message_data_import);
    });
  });

  it('should send GET request from getImportedList when useDummyData is false', () => {
    environment.useDummyData = false;

    service.getImportedList().subscribe();

    const req = httpMock.expectOne('');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call getDepotService and return data when useDummyData is true', () => {
    environment.useDummyData = true;

    service.getDepotService().subscribe(response => {
      expect(response.length).toBeGreaterThan(0);
    });
  });

  it('should call import with FormData', () => {
    const formData = new FormData();

    service.import(formData).subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${testUri}import/upload/zip`);
    expect(req.request.method).toBe('POST');
    req.flush(mockPayloadResponse);
  });

  it('should call sendMessageExportRequest', () => {
    environment.useDummyData = false;

    service.sendMessageExportRequest('2024-01-01', '1').subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${testUri}export/send-message-request`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ date_selected: '2024-01-01', svc_prov_id: '1' });
    req.flush(mockPayloadResponse);
  });

  it('should call sendMessageExportRequest when useDummyData is true', () => {
    environment.useDummyData = true;

    service.sendMessageExportRequest('2024-01-01', '1').subscribe(response => {
      expect(response.status).toBe(200);
    });

    const req = httpMock.expectOne(`${testUri}export/send-message-request`);
    req.flush(mockPayloadResponse);
  });

  it('should call export with returnBlob true and return a blob', () => {
    environment.useDummyData = false;
    const dummyBlob = new Blob(['zip content'], { type: 'application/zip' });

    service.export([], true).subscribe(response => {
      expect(response).toEqual(dummyBlob);
    });

    const req = httpMock.expectOne(`${testUri}export/download/zip`);
    expect(req.request.method).toBe('POST');
    expect(req.request.responseType).toBe('blob');
    req.flush(dummyBlob);
  });

  it('should call export without returnBlob and return JSON data', () => {
    environment.useDummyData = false;

    service.export([]).subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${testUri}export/download/zip`);
    expect(req.request.method).toBe('POST');
    req.flush(mockPayloadResponse);
  });

  it('should call searchExportFileByGroupId and return data', () => {
    environment.useDummyData = false;

    service
      .searchExportFileByGroupId('grp-id', 1, null)
      .subscribe(response => {
        expect(response).toEqual(mockPayloadResponse);
      });

    const req = httpMock.expectOne(`${testUri}export-file/search`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      message_data_export: {
        grp_identifier_id: 'grp-id',
        service_provider_id: 1,
        depot_id: null,
      },
    });
    req.flush(mockPayloadResponse);
  });

  describe('message export polling / running-state persistence', () => {
    const storageKey = 'dagw-message-data-export-running-state';

    beforeEach(() => {
      // Default: status check "succeeds" but no items are done yet, so
      // polling keeps running. Individual tests override this as needed.
      // This also guarantees no real (unflushed) HTTP request is made by
      // tests that don't care about the status-check response shape.
      spyOn(service, 'searchExportFileByGroupId').and.returnValue(
        of({
          status: 200,
          status_code: 'SUCCESS',
          timestamp: Date.now(),
          message: '',
          payload: { message_data_file_export: [] },
        } as PayloadResponse)
      );
    });

    it('startMessageExportPolling should persist running state and mark export in progress', () => {
      service.startMessageExportPolling('2024-01-01', 'grp1', 5);

      const snapshot = service.getMessageExportProcessSnapshot();
      expect(snapshot.isExportInProgress).toBeTrue();
      expect(snapshot.dateSelected).toBe('2024-01-01');
      expect(snapshot.grpIdentifierId).toBe('grp1');
      expect(snapshot.serviceProviderId).toBe(5);
      expect(mockWebSocketService.refreshTrigger).toHaveBeenCalled();

      const stored = JSON.parse(sessionStorage.getItem(storageKey)!);
      expect(stored.grpIdentifierId).toBe('grp1');
    });

    it('startMessageExportPolling should mark the export complete once the status check reports SUCCESS for every item', () => {
      (service.searchExportFileByGroupId as jasmine.Spy).and.returnValue(
        of({
          status: 200,
          status_code: 'SUCCESS',
          timestamp: Date.now(),
          message: '',
          payload: { message_data_file_export: [{ status: 'SUCCESS' }] },
        } as PayloadResponse)
      );

      service.startMessageExportPolling('2024-01-01', 'grp1', 5);

      const snapshot = service.getMessageExportProcessSnapshot();
      expect(snapshot.success).toBeTrue();
      expect(snapshot.isExportInProgress).toBeFalse();
      expect(sessionStorage.getItem(storageKey)).toBeNull();
    });

    it('startMessageExportPolling should keep polling when not every item has succeeded yet', () => {
      (service.searchExportFileByGroupId as jasmine.Spy).and.returnValue(
        of({
          status: 200,
          status_code: 'SUCCESS',
          timestamp: Date.now(),
          message: '',
          payload: {
            message_data_file_export: [{ status: 'SUCCESS' }, { status: 'PENDING' }],
          },
        } as PayloadResponse)
      );

      service.startMessageExportPolling('2024-01-01', 'grp1', 5);

      const snapshot = service.getMessageExportProcessSnapshot();
      expect(snapshot.success).toBeFalse();
      expect(snapshot.isExportInProgress).toBeTrue();
      expect(sessionStorage.getItem(storageKey)).not.toBeNull();
    });

    it('startMessageExportPolling should leave state untouched when the status check response is not 200', () => {
      (service.searchExportFileByGroupId as jasmine.Spy).and.returnValue(
        of({
          status: 500,
          status_code: 'ERROR',
          timestamp: Date.now(),
          message: '',
          payload: {},
        } as PayloadResponse)
      );

      service.startMessageExportPolling('2024-01-01', 'grp1', 5);

      const snapshot = service.getMessageExportProcessSnapshot();
      expect(snapshot.payload).toBeNull();
      expect(snapshot.isExportInProgress).toBeTrue();
    });

    it('startMessageExportPolling should recover gracefully when the status check errors out', () => {
      (service.searchExportFileByGroupId as jasmine.Spy).and.returnValue(
        new Observable<PayloadResponse>(subscriber => {
          subscriber.error('network down');
        })
      );

      expect(() => service.startMessageExportPolling('2024-01-01', 'grp1', 5)).not.toThrow();
      expect((service as any).messageExportStatusCheckInProgress).toBeFalse();
    });

    it('resumeMessageExportPolling should be a no-op when no running state was saved', () => {
      const before = service.getMessageExportProcessSnapshot();
      service.resumeMessageExportPolling();
      expect(service.getMessageExportProcessSnapshot()).toEqual(before);
    });

    it('resumeMessageExportPolling should time out immediately when the saved state is already expired', () => {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          dateSelected: '2024-01-01',
          grpIdentifierId: 'grp1',
          serviceProviderId: 5,
          startedAt: Date.now() - 999999999,
        })
      );

      service.resumeMessageExportPolling();

      const snapshot = service.getMessageExportProcessSnapshot();
      expect(snapshot.timedOut).toBeTrue();
      expect(snapshot.isExportInProgress).toBeFalse();
      expect(sessionStorage.getItem(storageKey)).toBeNull();
    });

    it('resumeMessageExportPolling should resume an in-progress export and re-arm the polling timer', () => {
      (service.searchExportFileByGroupId as jasmine.Spy).and.returnValue(
        of({
          status: 200,
          status_code: 'SUCCESS',
          timestamp: Date.now(),
          message: '',
          payload: { message_data_file_export: [] },
        } as PayloadResponse)
      );

      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          dateSelected: '2024-01-01',
          grpIdentifierId: 'grp1',
          serviceProviderId: 5,
          startedAt: Date.now(),
        })
      );

      service.resumeMessageExportPolling();

      expect(mockWebSocketService.refreshTrigger).toHaveBeenCalled();
      const snapshot = service.getMessageExportProcessSnapshot();
      expect(snapshot.isExportInProgress).toBeTrue();
    });

    it('resumeMessageExportPolling should not re-arm the timer when polling is already active', () => {
      service.startMessageExportPolling('2024-01-01', 'grp1', 5);
      mockWebSocketService.refreshTrigger.calls.reset();

      service.resumeMessageExportPolling();

      expect(mockWebSocketService.refreshTrigger).not.toHaveBeenCalled();
    });

    it('resumeMessageExportPolling should clear the stored state and return null when it is malformed JSON', () => {
      spyOn(console, 'error');
      sessionStorage.setItem(storageKey, 'not-json{');

      service.resumeMessageExportPolling();

      expect(console.error).toHaveBeenCalled();
      expect(sessionStorage.getItem(storageKey)).toBeNull();
      expect(service.getMessageExportProcessSnapshot().isExportInProgress).toBeFalse();
    });

    it('resumeMessageExportPolling should clear the stored state and return null when required fields are missing', () => {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ dateSelected: '2024-01-01' })
      );

      service.resumeMessageExportPolling();

      expect(sessionStorage.getItem(storageKey)).toBeNull();
    });

    it('clearMessageExportProcessState should remove running state and reset to the initial snapshot', () => {
      service.startMessageExportPolling('2024-01-01', 'grp1', 5);

      service.clearMessageExportProcessState();

      expect(sessionStorage.getItem(storageKey)).toBeNull();
      const snapshot = service.getMessageExportProcessSnapshot();
      expect(snapshot.isExportInProgress).toBeFalse();
      expect(snapshot.dateSelected).toBeNull();
    });

    it('clearCompletedMessageExportProcessState should leave an in-progress export untouched', () => {
      service.startMessageExportPolling('2024-01-01', 'grp1', 5);

      service.clearCompletedMessageExportProcessState();

      expect(service.getMessageExportProcessSnapshot().isExportInProgress).toBeTrue();
    });

    it('clearCompletedMessageExportProcessState should reset state when the export is not in progress', () => {
      service.clearCompletedMessageExportProcessState();

      const snapshot = service.getMessageExportProcessSnapshot();
      expect(snapshot.dateSelected).toBeNull();
      expect(snapshot.isExportInProgress).toBeFalse();
    });

    it('should not persist or read running state when sessionStorage is unavailable', () => {
      spyOn(service as any, 'isSessionStorageAvailable').and.returnValue(false);
      spyOn(sessionStorage, 'setItem');
      spyOn(sessionStorage, 'getItem');
      spyOn(sessionStorage, 'removeItem');

      service.startMessageExportPolling('2024-01-01', 'grp1', 5);
      service.resumeMessageExportPolling();
      service.clearMessageExportProcessState();

      expect(sessionStorage.setItem).not.toHaveBeenCalled();
      expect(sessionStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('areAllMessageExportItemsSuccessful / normalizeMessageExportStatus (private helpers)', () => {
    it('should return false when the export item list is empty', () => {
      expect(
        (service as any).areAllMessageExportItemsSuccessful({
          message_data_file_export: [],
        })
      ).toBeFalse();
    });

    it('should return false when the payload key is missing entirely', () => {
      expect((service as any).areAllMessageExportItemsSuccessful({})).toBeFalse();
    });

    it('should return true when every item normalizes to SUCCESS regardless of case/whitespace', () => {
      expect(
        (service as any).areAllMessageExportItemsSuccessful({
          message_data_file_export: [{ status: ' success ' }, { status: 'SUCCESS' }],
        })
      ).toBeTrue();
    });

    it('should return false when at least one item is not SUCCESS', () => {
      expect(
        (service as any).areAllMessageExportItemsSuccessful({
          message_data_file_export: [{ status: 'SUCCESS' }, { status: 'FAILED' }],
        })
      ).toBeFalse();
    });
  });

  describe('timeoutMessageExport (private, exercised directly)', () => {
    it('should mark the state as timed out and clear stored running state', () => {
      sessionStorage.setItem(
        'dagw-message-data-export-running-state',
        JSON.stringify({
          dateSelected: '2024-01-01',
          grpIdentifierId: 'grp1',
          serviceProviderId: 5,
          startedAt: Date.now(),
        })
      );

      (service as any).timeoutMessageExport({
        dateSelected: '2024-01-01',
        grpIdentifierId: 'grp1',
        serviceProviderId: 5,
        startedAt: Date.now(),
      });

      const snapshot = service.getMessageExportProcessSnapshot();
      expect(snapshot.timedOut).toBeTrue();
      expect(snapshot.isExportInProgress).toBeFalse();
      expect(snapshot.grpIdentifierId).toBeNull();
      expect(
        sessionStorage.getItem('dagw-message-data-export-running-state')
      ).toBeNull();
    });
  });
});
