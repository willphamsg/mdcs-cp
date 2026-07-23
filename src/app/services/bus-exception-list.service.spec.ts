import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { IParams, PayloadResponse } from '../models/common';
import { ManageBusExceptionListService } from './bus-exception-list.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { of } from 'rxjs';
import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('ManageBusExceptionListService', () => {
  let service: ManageBusExceptionListService;
  let httpClientMock: HttpClient;
  let httpMock: HttpTestingController;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;

  const mockParams: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      status: [],
      current_depot: [],
      current_operator: [],
      future_operator: [],
    },
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

    TestBed.configureTestingModule({
    imports: [],
    providers: [
        ManageBusExceptionListService,
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
});

    service = TestBed.inject(ManageBusExceptionListService);
    httpClientMock = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return dummy data when useDummyData is true', () => {
    spyOn(service, 'search').and.callFake(() => of(mockResponse));

    environment.useDummyData = true;

    service.search(mockParams).subscribe((response: PayloadResponse) => {
      expect(response).toEqual(mockResponse);
    });
  });

  it('should send a search request and return data', () => {
    environment.useDummyData = false;

    service.search(mockParams).subscribe(response => {
      expect(response).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${service['uri']}search`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);

    httpMock.verify();
  });
});
