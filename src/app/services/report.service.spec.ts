import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ReportService } from './report.service';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { environment } from '@env/environment';

describe('ReportService', () => {
  let service: ReportService;
  let httpMock: HttpTestingController;
  let mockDynamicEndpoint: jasmine.SpyObj<DynamicEndpoint>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  const testUri = 'http://test/ssrs-report/';

  beforeEach(() => {
    mockDynamicEndpoint = jasmine.createSpyObj('DynamicEndpoint', ['setDynamicEndpoint']);
    mockDynamicEndpoint.setDynamicEndpoint.and.returnValue(testUri);
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);

    TestBed.configureTestingModule({
      providers: [
        ReportService,
        { provide: DynamicEndpoint, useValue: mockDynamicEndpoint },
        { provide: MessageService, useValue: mockMessageService },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ReportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return report URL when useDummyData is true', () => {
    environment.useDummyData = true;

    const url = service.getReportURL('TestReport', '&param=value');
    expect(url).toContain('ReportViewer.aspx');
  });

  it('should return constructed report URL when useDummyData is false', () => {
    environment.useDummyData = false;

    const url = service.getReportURL('TestReport', '&param=value');
    expect(url).toBe(`${testUri}ReportServer/Pages/ReportViewer.aspx?/TestReport&param=value`);
  });

  it('should call getReportHtml and return HTML string', () => {
    environment.useDummyData = false;

    const mockHtml = '<html><body>Report</body></html>';

    service.getReportHtml('TestReport', '&param=value').subscribe(response => {
      expect(response).toBe(mockHtml);
    });

    const expectedUrl = `${testUri}ReportServer/Pages/ReportViewer.aspx?/TestReport&param=value`;
    const req = httpMock.expectOne(expectedUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('text');
    req.flush(mockHtml);
  });
});
