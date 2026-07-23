import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { Store } from '@ngrx/store';
import { AuthService } from './auth.service';
import { CommonService } from './common.service';
import { sessionExpiryInterceptor } from './session-expiry.interceptor';
import { of } from 'rxjs';

describe('sessionExpiryInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let mockStore: jasmine.SpyObj<Store>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockCommonService: jasmine.SpyObj<CommonService>;

  beforeEach(() => {
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['logout']);
    mockCommonService = jasmine.createSpyObj('CommonService', ['getSettingDefault']);
    mockCommonService.getSettingDefault.and.returnValue(of({ logout_url: '/logout' }));

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([sessionExpiryInterceptor])),
        provideHttpClientTesting(),
        { provide: Store, useValue: mockStore },
        { provide: AuthService, useValue: mockAuthService },
        { provide: CommonService, useValue: mockCommonService },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should pass through successful requests', () => {
    httpClient.get('/api/data').subscribe(response => {
      expect(response).toEqual({ data: 'test' });
    });

    const req = httpMock.expectOne('/api/data');
    req.flush({ data: 'test' });
  });

  it('should pass through non-401 errors', () => {
    httpClient.get('/api/data').subscribe({
      error: (error) => {
        expect(error.status).toBe(500);
      },
    });

    const req = httpMock.expectOne('/api/data');
    req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
  });

  it('should pass through 403 errors without redirect', () => {
    httpClient.get('/api/data').subscribe({
      error: (error) => {
        expect(error.status).toBe(403);
      },
    });

    const req = httpMock.expectOne('/api/data');
    req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
  });
});
