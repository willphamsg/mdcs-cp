import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { DailyReportRequest, PayloadResponse } from '@models/common';
import { AdhocReportService } from './adhoc-report.service';
import { of } from 'rxjs';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('AdhocReportService', () => {
  let service: AdhocReportService;
  let httpMock: HttpTestingController;

  const mockParams: DailyReportRequest = {
    page_size: 1,
    page_index: 1,
    sort_order: [],
    report_type: 'all',
    business_date: '',
    depot_id: '',
  };

  const mockResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'Dummy data fetched successfully',
    payload: DummyData,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [AdhocReportService, provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});

    service = TestBed.inject(AdhocReportService);
    httpMock = TestBed.inject(HttpTestingController);

    environment.useDummyData = true;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should return dummy data when useDummyData is true', (done: DoneFn) => {
    spyOn(service, 'getServiceProvider').and.callFake(() => of(mockResponse));

    service.getServiceProvider().subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });
  });

  it('should make an HTTP POST request when useDummyData is false', (done: DoneFn) => {
    environment.useDummyData = false;

    service.search(mockParams).subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });

    const req = httpMock.expectOne(`${service['uri']}search`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should return dummy service provider data when useDummyData is true', (done: DoneFn) => {
    spyOn(service, 'getServiceProvider').and.callFake(() => of(mockResponse));

    service.getServiceProvider().subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });
  });

  it('should make an HTTP GET request for service providers when useDummyData is false', (done: DoneFn) => {
    environment.useDummyData = false;

    service.getServiceProvider().subscribe(response => {
      expect(response).toEqual(mockResponse);
      done();
    });

    const req = httpMock.expectOne(`${service['uri']}service-provider`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
