import { HttpClient, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { of } from 'rxjs';
import { DailyReportRequest, PayloadResponse } from '../models/common';
import { DailyReportService } from './daily-report.service';
import { DynamicEndpoint } from './dynamic-endpoint';

describe('DailyReportService', () => {
  let service: DailyReportService;
  let httpClientMock: HttpClient;
  let httpMock: HttpTestingController;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;

  const mockParams: DailyReportRequest = {
    page_size: 5,
    page_index: 0,
    sort_order: [],
    business_date: '',
    depot_id: '',
    report_type: 'all',
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
        DailyReportService,
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
});

    service = TestBed.inject(DailyReportService);
    httpClientMock = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // it('should return dummy data when useDummyData is true', () => {
  //   spyOn(service, 'search').and.callFake(() => of(mockResponse));

  //   environment.useDummyData = true;

  //   service.search(mockParams).subscribe((response: PayloadResponse) => {
  //     expect(response).toEqual(mockResponse);
  //   });
  // });

  // it('should send a search request and return data', () => {
  //   environment.useDummyData = false;

  //   service.search(mockParams).subscribe(response => {
  //     expect(response).toEqual(mockResponse);
  //   });

  //   const req = httpMock.expectOne(`${service['uri']}search`);
  //   expect(req.request.method).toBe('POST');
  //   req.flush(mockResponse);

  //   httpMock.verify();
  // });
});
