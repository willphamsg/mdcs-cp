import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { IParams, PayloadResponse } from '../models/common';
import { DynamicEndpoint } from './dynamic-endpoint';
import { AuthService } from './auth.service';
import { MessageService } from './message.service';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FileImportExportService } from './file-import-export.service';
import { IFile } from '@app/models/parameter-management';
import { MatDialog } from '@angular/material/dialog';

describe('FileImportExportService', () => {
  let service: FileImportExportService;
  let httpMock: HttpTestingController;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Success',
    payload: DummyData.parameter_file_data,
  };

  const mockBusRequest: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: null,
    search_select_filter: {},
  };

  const testUri = 'http://test/param/';

  beforeEach(() => {
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', ['setDynamicEndpoint']);
    mockDynamicEndpoint.setDynamicEndpoint.and.returnValue(testUri);
    mockAuthService = jasmine.createSpyObj('AuthService', ['getToken']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        FileImportExportService,
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: MatDialog, useValue: mockDialog },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(FileImportExportService);
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

    service.manage(mockBusRequest, 'import').subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${testUri}import/search`);
    expect(req.request.method).toBe('POST');
    req.flush(mockPayloadResponse);
  });

  it('should call searchExport when manage is called with export type', () => {
    environment.useDummyData = false;

    service.manage(mockBusRequest, 'export').subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${testUri}export/search`);
    expect(req.request.method).toBe('POST');
    req.flush(mockPayloadResponse);
  });

  it('should return dummy data from getImportedList when useDummyData is true', () => {
    environment.useDummyData = true;

    service.getImportedList().subscribe((response: IFile[]) => {
      expect(response).toEqual(DummyData.parameter_file_data);
    });
  });

  it('should send GET request from getImportedList when useDummyData is false', () => {
    environment.useDummyData = false;

    service.getImportedList().subscribe(response => {
      expect(response).toEqual(DummyData.parameter_file_data);
    });

    const req = httpMock.expectOne('');
    expect(req.request.method).toBe('GET');
    req.flush(DummyData.parameter_file_data);
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

  it('should call exportFileRequest', () => {
    const params = { file_id: '123' };

    service.exportFileRequest(params).subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${testUri}export/send-file-request`);
    expect(req.request.method).toBe('POST');
    req.flush(mockPayloadResponse);
  });

  it('should call exportStatus', () => {
    const params = { file_id: '123' };

    service.exportStatus(params).subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${testUri}export/search-export-status`);
    expect(req.request.method).toBe('POST');
    req.flush(mockPayloadResponse);
  });
});
