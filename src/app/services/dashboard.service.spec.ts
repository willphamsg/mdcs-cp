import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { DashboardService } from './dashboard.service';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { PayloadResponse } from '@app/models/common';
import { IConnectedBusParams } from '@app/models/bus-operation';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const busUri = 'http://test-bus/';
  const commonUri = 'http://test-common/';
  const paramUri = 'http://test-param/';

  const mockPayloadResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Success',
    payload: {},
  };

  beforeEach(() => {
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', ['setDynamicEndpoint']);
    mockDynamicEndpoint.setDynamicEndpoint.and.callFake((type: string) => {
      if (type === 'bus') return busUri;
      if (type === 'common') return commonUri;
      if (type === 'param') return paramUri;
      return '';
    });
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        { provide: MessageService, useValue: mockMessageService },
        { provide: MatDialog, useValue: mockDialog },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call getDagwStatus and return PayloadResponse', () => {
    service.getDagwStatus().subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${commonUri}system-info/dagw-system-status`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPayloadResponse);
  });

  it('should call getBusTransferCount and return PayloadResponse', () => {
    service.getBusTransferCount().subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${busUri}bus-transfer/count-in-progress`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPayloadResponse);
  });

  it('should call getTaskList and return PayloadResponse', () => {
    service.getTaskList().subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${paramUri}parameter/trial/status-count`);
    expect(req.request.method).toBe('GET');
    req.flush(mockPayloadResponse);
  });

  it('should call search with IConnectedBusParams', () => {
    const params: IConnectedBusParams = {
      depot_ids: [1, 2],
      hours: 24,
    };

    service.search(params).subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${busUri}bus-operation-status/connected-buses`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(params);
    req.flush(mockPayloadResponse);
  });
});
