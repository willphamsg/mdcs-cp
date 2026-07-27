import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  downloadLogsAsCsv,
  getRequestLogs,
  requestLogInterceptor,
} from './request-log.interceptor';

describe('requestLogInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([requestLogInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should pass through a successful GET request unmodified and record a log entry', () => {
    const beforeCount = getRequestLogs().length;

    httpClient.get('/api/data').subscribe((response) => {
      expect(response).toEqual({ data: 'test' });
    });

    const req = httpMock.expectOne('/api/data');
    expect(req.request.method).toBe('GET');
    req.flush({ data: 'test' });

    const logs = getRequestLogs();
    expect(logs.length).toBe(beforeCount + 1);

    const entry = logs[logs.length - 1];
    expect(entry.request.method).toBe('GET');
    expect(entry.request.url).toBe('/api/data');
    expect(entry.request.body).toBeNull();
    expect(entry.response).toEqual({ data: 'test' });
    expect(entry.requestTimestamp).toBeTruthy();
    expect(entry.responseTimestamp).toBeTruthy();
  });

  it('should capture query params and pass through a string-body request with a numeric response', () => {
    httpClient
      .post('/api/submit', 'hello', { params: { foo: 'bar' } })
      .subscribe((response) => {
        expect(response).toBe(123);
      });

    const req = httpMock.expectOne((r) => r.url === '/api/submit');
    expect(req.request.params.get('foo')).toBe('bar');
    req.flush(123);

    const logs = getRequestLogs();
    const entry = logs[logs.length - 1];
    expect(entry.request.body).toBe('hello');
    expect(entry.request.params).toEqual({ foo: 'bar' });
    expect(entry.response).toBe(123);
  });

  it('should not record a log entry when the request errors out', () => {
    const beforeCount = getRequestLogs().length;

    httpClient.get('/api/error').subscribe({
      error: (error) => {
        expect(error.status).toBe(500);
      },
    });

    const req = httpMock.expectOne('/api/error');
    req.flush('Server Error', {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(getRequestLogs().length).toBe(beforeCount);
  });

  it('should export accumulated logs (covering null, string, number and object cell values) as a CSV download', () => {
    // Null body + object response -> exercises the null/undefined and
    // JSON.stringify branches of escapeCsvCell.
    httpClient.get('/api/csv-null-object').subscribe();
    httpMock.expectOne('/api/csv-null-object').flush({ nested: true });

    // String body + numeric response -> exercises the string and
    // number/boolean/bigint branches of escapeCsvCell.
    httpClient
      .post('/api/csv-string-number', 'plain-text')
      .subscribe();
    httpMock.expectOne('/api/csv-string-number').flush(42);

    expect(getRequestLogs().length).toBeGreaterThanOrEqual(2);

    const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');
    spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
    const revokeSpy = spyOn(URL, 'revokeObjectURL');

    downloadLogsAsCsv('test-export.csv');

    expect(clickSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should warn and skip the download when there are no logs to export', () => {
    const warnSpy = spyOn(console, 'warn');
    const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');

    // getRequestLogs() returns the live module-level array; empty it out for
    // this assertion without disturbing entries other tests may rely on.
    const logs = getRequestLogs();
    const originalEntries = logs.splice(0, logs.length);

    downloadLogsAsCsv();

    expect(warnSpy).toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();

    logs.push(...originalEntries);
  });
});
