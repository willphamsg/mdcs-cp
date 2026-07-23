import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { IParams, PayloadResponse } from '@app/models/common';
import DummyData from '@data/db.json';
import { EventHistoryService } from './event-history.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { MessageService } from './message.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('EventHistoryService', () => {
  let service: EventHistoryService;
  let httpMock: HttpTestingController;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  const mockParams: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {},
  };

  const mockResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: DummyData,
  };

  beforeEach(() => {
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', ['setDynamicEndpoint']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);

    TestBed.configureTestingModule({
      imports: [],
      providers: [
        EventHistoryService,
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        { provide: MessageService, useValue: mockMessageService },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(EventHistoryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send a search request and return data', () => {
    service.search(mockParams).subscribe((response: PayloadResponse) => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${service['uri']}search`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });
});
