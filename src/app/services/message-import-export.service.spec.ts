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
});
