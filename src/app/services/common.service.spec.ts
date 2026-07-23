import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { IParams, PayloadResponse } from '../models/common';
import { ManageBusExceptionListService } from './bus-exception-list.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { of } from 'rxjs';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { CommonService } from './common.service';
import { MessageService } from './message.service';

describe('CommonService', () => {
  let service: CommonService;
  let httpClientMock: HttpClient;
  let httpMock: HttpTestingController;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  const mockParams = {
    patternSearch: false,
    search_text: '',
    is_pattern_search: false,
    page_size: 1,
    page_index: 1,
    sort_order: [],
  };

  const mockResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: DummyData,
  };

  beforeEach(() => {
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', [
      'setDynamicEndpoint',
    ]);

    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);

    TestBed.configureTestingModule({
    imports: [],
    providers: [
        ManageBusExceptionListService,
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        { provide: MessageService, useValue: mockMessageService },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
});

    service = TestBed.inject(CommonService);
    httpClientMock = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send a search request and return data', (done: DoneFn) => {
    spyOn(service, 'search').and.callFake(() => of(mockResponse));

    service.search(mockParams).subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });
  });
});
