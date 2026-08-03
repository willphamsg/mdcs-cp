import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { IParams, PayloadResponse } from '../models/common';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MessageDataImportExportService } from './message-import-export.service';
import { MessageService } from './message.service';
import { AuthService } from './auth.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { MatDialog } from '@angular/material/dialog';

describe('MessageDataImportExportService', () => {
  let service: MessageDataImportExportService;
  let httpMock: HttpTestingController;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  const mockResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: DummyData,
  };

  const mockBusRequest: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: null,
    search_select_filter: {},
  };

  beforeEach(() => {
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);

    const mockAuthService = jasmine.createSpyObj('AuthService', ['getToken', 'getSVCProvider']);
    mockAuthService.getToken.and.returnValue('mock-token');

    const mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', ['setDynamicEndpoint']);
    mockDynamicEndpoint.setDynamicEndpoint.and.callFake((_module: string, uri: string) => uri);

    const mockMatDialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        MessageDataImportExportService,
        { provide: MessageService, useValue: mockMessageService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        { provide: MatDialog, useValue: mockMatDialog },
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

  it('should call searchExport and return data', () => {
    environment.useDummyData = false;

    service.searchExport(mockBusRequest).subscribe((response: any) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.gateway}message-data/export/search`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should return dummy data from getImportedList when useDummyData is true', () => {
    environment.useDummyData = true;

    service.getImportedList().subscribe(response => {
      expect(response).toEqual(DummyData.message_data_import);
    });
  });

  it('should send GET request from getImportedList when useDummyData is false', () => {
    environment.useDummyData = false;

    service.getImportedList().subscribe(response => {
      expect(response).toEqual(DummyData.message_data_import);
    });

    const req = httpMock.expectOne('');
    expect(req.request.method).toBe('GET');
    req.flush(DummyData.message_data_import);
  });

  it('should call searchImport and return data', () => {
    environment.useDummyData = false;

    service.searchImport(mockBusRequest).subscribe((response: any) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.gateway}message-data/import/search`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockBusRequest);
    req.flush(mockResponse);
  });

  it('should call searchImportByGroupId and return data', () => {
    environment.useDummyData = false;

    service.searchImportByGroupId('test-grp-id').subscribe((response: any) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.gateway}message-data/import/search`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ grp_identifier: 'test-grp-id' });
    req.flush(mockResponse);
  });

  it('should call import with FormData and return data', () => {
    environment.useDummyData = false;
    const formData = new FormData();

    service.import(formData).subscribe((response: any) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.gateway}message-data/import/upload/zip`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should call export with returnBlob true and return a blob', () => {
    environment.useDummyData = false;
    const dummyBlob = new Blob(['zip content'], { type: 'application/zip' });

    service.export([], true).subscribe(response => {
      expect(response).toEqual(dummyBlob);
    });

    const req = httpMock.expectOne(`${environment.gateway}message-data/export/download/zip`);
    expect(req.request.method).toBe('POST');
    expect(req.request.responseType).toBe('blob');
    req.flush(dummyBlob);
  });

  it('should call export without returnBlob and return JSON data', () => {
    environment.useDummyData = false;

    service.export([]).subscribe((response: any) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.gateway}message-data/export/download/zip`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  describe('manage', () => {
    it('should delegate to searchImport when type is "import"', () => {
      environment.useDummyData = false;
      spyOn(service, 'searchImport').and.callThrough();

      service.manage(mockBusRequest, 'import').subscribe();

      expect(service.searchImport).toHaveBeenCalledWith(mockBusRequest);
      const req = httpMock.expectOne(`${environment.gateway}message-data/import/search`);
      req.flush(mockResponse);
    });

    it('should delegate to searchExport for any other type', () => {
      environment.useDummyData = false;
      spyOn(service, 'searchExport').and.callThrough();

      service.manage(mockBusRequest, 'export').subscribe();

      expect(service.searchExport).toHaveBeenCalledWith(mockBusRequest);
      const req = httpMock.expectOne(`${environment.gateway}message-data/export/search`);
      req.flush(mockResponse);
    });
  });

  it('should return dummy data from searchImport when useDummyData is true', () => {
    environment.useDummyData = true;

    service.searchImport(mockBusRequest).subscribe(response => {
      expect(response.status).toBe(200);
      expect(response.status_code).toBe('SUCCESS');
    });
  });

  it('should propagate an error via MessageService.multiError from searchImport', () => {
    environment.useDummyData = false;

    service.searchImport(mockBusRequest).subscribe({
      next: () => fail('should have errored'),
      error: () => {
        expect(mockMessageService.multiError).toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne(`${environment.gateway}message-data/import/search`);
    req.flush('boom', { status: 500, statusText: 'Server Error' });
  });

  it('should return dummy data from searchImportByGroupId when useDummyData is true', () => {
    environment.useDummyData = true;

    service.searchImportByGroupId('grp-1').subscribe(response => {
      expect(response.status).toBe(200);
      expect(response.status_code).toBe('INFO 2020');
    });
  });

  it('should propagate an error via MessageService.multiError from searchImportByGroupId', () => {
    environment.useDummyData = false;

    service.searchImportByGroupId('grp-1').subscribe({
      next: () => fail('should have errored'),
      error: () => {
        expect(mockMessageService.multiError).toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne(`${environment.gateway}message-data/import/search`);
    req.flush('boom', { status: 500, statusText: 'Server Error' });
  });

  it('should return dummy data from searchExport when useDummyData is true', () => {
    environment.useDummyData = true;

    service.searchExport(mockBusRequest).subscribe(response => {
      expect(response.status).toBe(200);
      expect(response.status_code).toBe('SUCCESS');
    });
  });

  it('should propagate an error via MessageService.multiError from searchExport', () => {
    environment.useDummyData = false;

    service.searchExport(mockBusRequest).subscribe({
      next: () => fail('should have errored'),
      error: () => {
        expect(mockMessageService.multiError).toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne(`${environment.gateway}message-data/export/search`);
    req.flush('boom', { status: 500, statusText: 'Server Error' });
  });

  it('should propagate an error via MessageService.multiError from import', () => {
    const formData = new FormData();

    service.import(formData).subscribe({
      next: () => fail('should have errored'),
      error: () => {
        expect(mockMessageService.multiError).toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne(`${environment.gateway}message-data/import/upload/zip`);
    req.flush('boom', { status: 500, statusText: 'Server Error' });
  });

  it('should log and propagate an error via MessageService.multiError from export blob download', () => {
    environment.useDummyData = false;
    spyOn(console, 'error');

    service.export([], true).subscribe({
      next: () => fail('should have errored'),
      error: () => {
        expect(console.error).toHaveBeenCalled();
        expect(mockMessageService.multiError).toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne(`${environment.gateway}message-data/export/download/zip`);
    // The request uses responseType: 'blob', so TestRequest.flush() can only
    // auto-convert a real Blob/ArrayBuffer body (or null) — a plain string
    // body throws "Automatic conversion to Blob is not supported". Flushing
    // with a null body still triggers the error path being tested here.
    req.flush(null, { status: 500, statusText: 'Server Error' });
  });

  it('should propagate an error via MessageService.multiError from export JSON download', () => {
    environment.useDummyData = false;

    service.export([]).subscribe({
      next: () => fail('should have errored'),
      error: () => {
        expect(mockMessageService.multiError).toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne(`${environment.gateway}message-data/export/download/zip`);
    req.flush('boom', { status: 500, statusText: 'Server Error' });
  });

  describe('getDepotService', () => {
    it('should return dummy depot data mapped with a value field when useDummyData is true', () => {
      environment.useDummyData = true;

      service.getDepotService().subscribe(response => {
        expect(response.length).toBeGreaterThan(0);
        expect(response[0].value).toBe(response[0].depot_name);
      });
    });

    it('should send a GET request when useDummyData is false', () => {
      environment.useDummyData = false;

      service.getDepotService().subscribe(response => {
        expect(response).toEqual([]);
      });

      const req = httpMock.expectOne('');
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('sendMessageExportRequest', () => {
    it('should return dummy data when useDummyData is true', () => {
      environment.useDummyData = true;

      service.sendMessageExportRequest('2024-01-01').subscribe(response => {
        expect(response.status).toBe(200);
        expect(response.status_code).toBe('SUCCESS');
      });
    });

    it('should send a POST request with the selected date when useDummyData is false', () => {
      environment.useDummyData = false;

      service.sendMessageExportRequest('2024-01-01').subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(
        `${environment.gateway}message-data/export/send-message-request`
      );
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ date_selected: '2024-01-01' });
      req.flush(mockResponse);
    });

    it('should propagate an error via MessageService.multiError', () => {
      environment.useDummyData = false;

      service.sendMessageExportRequest('2024-01-01').subscribe({
        next: () => fail('should have errored'),
        error: () => {
          expect(mockMessageService.multiError).toHaveBeenCalled();
        },
      });

      const req = httpMock.expectOne(
        `${environment.gateway}message-data/export/send-message-request`
      );
      req.flush('boom', { status: 500, statusText: 'Server Error' });
    });
  });
});
