import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { BusOperationService } from './bus-operation.service';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { environment } from '@env/environment';
import { IParams, PayloadResponse } from '@app/models/common';

describe('BusOperationService', () => {
  let service: BusOperationService;
  let httpMock: HttpTestingController;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const testUri = 'http://test/bus-operation-status/';

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
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      providers: [
        BusOperationService,
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        { provide: MessageService, useValue: mockMessageService },
        { provide: MatDialog, useValue: mockDialog },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(BusOperationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call search and return PayloadResponse', () => {
    service.search(mockParams).subscribe(response => {
      expect(response).toEqual(mockPayloadResponse);
    });

    const req = httpMock.expectOne(`${testUri}search`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockParams);
    req.flush(mockPayloadResponse);
  });
});
