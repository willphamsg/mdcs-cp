import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MessageDataImportExportService } from './message-data-import-export.service';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { AuthService } from './auth.service';
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

    TestBed.configureTestingModule({
      providers: [
        MessageDataImportExportService,
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        { provide: MessageService, useValue: mockMessageService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MatDialog, useValue: mockDialog },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(MessageDataImportExportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
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
});
