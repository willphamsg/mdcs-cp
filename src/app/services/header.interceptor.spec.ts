import { HttpRequest, HttpHandler, HttpEvent, HttpClient, HTTP_INTERCEPTORS, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { headerInterceptor } from './header.interceptor';
import { AuthService } from './auth.service';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('headerInterceptor', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let httpTestingController: HttpTestingController;
  let httpClient: HttpClient;

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['getToken']);

    authServiceSpy.getToken.and.returnValue('token');

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        provideHttpClient(withInterceptors([headerInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    mockAuthService = TestBed.inject(
      AuthService
    ) as jasmine.SpyObj<AuthService>;
    httpTestingController = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  it('should add auth headers ', () => {
    const url = '/mockendpoint';

    httpClient.get(url).subscribe();

    const req = httpTestingController.expectOne(url);
    req.request.headers.set('Authorization', 'Bearer token');

    expect(req.request.headers.get('Authorization')).toEqual('Bearer token');
    httpTestingController.verify();
  });
});
