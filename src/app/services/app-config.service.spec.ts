import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AppConfigService } from './app-config.service';
import { environment } from '@env/environment';

describe('AppConfigService', () => {
  let service: AppConfigService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppConfigService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AppConfigService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load config and set environment flags', async () => {
    const mockConfig = {
      APP_MODE: 'DAGW',
      version: '2.0.0',
      DAGW_DEPOT: 5,
    };

    const promise = service.loadConfig();

    const req = httpMock.expectOne('/assets/app-config.json');
    expect(req.request.method).toBe('GET');
    req.flush(mockConfig);

    await promise;

    expect(environment.dagw).toBeTrue();
    expect(environment.version).toBe('2.0.0');
  });

  it('should return null for getConfig when config is not loaded', () => {
    expect(service.getConfig('APP_MODE')).toBeNull();
  });

  it('should return config value after loading', async () => {
    const mockConfig = { APP_MODE: 'DAGW', version: '1.0.0' };

    const promise = service.loadConfig();
    const req = httpMock.expectOne('/assets/app-config.json');
    req.flush(mockConfig);
    await promise;

    expect(service.getConfig('APP_MODE')).toBe('DAGW');
  });

  it('should return appMode from config', async () => {
    const mockConfig = { APP_MODE: 'DAGW' };

    const promise = service.loadConfig();
    const req = httpMock.expectOne('/assets/app-config.json');
    req.flush(mockConfig);
    await promise;

    expect(service.appMode).toBe('DAGW');
  });

  it('should return dagwDepot from config', async () => {
    const mockConfig = { APP_MODE: 'DAGW', DAGW_DEPOT: 3 };

    const promise = service.loadConfig();
    const req = httpMock.expectOne('/assets/app-config.json');
    req.flush(mockConfig);
    await promise;

    expect(service.dagwDepot).toBe(3);
  });

  it('should handle load config failure gracefully', async () => {
    spyOn(console, 'error');

    const promise = service.loadConfig();
    const req = httpMock.expectOne('/assets/app-config.json');
    req.error(new ProgressEvent('error'));

    await promise;

    expect(console.error).toHaveBeenCalled();
  });
});
