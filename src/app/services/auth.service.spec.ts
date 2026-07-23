import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { AuthService } from './auth.service';
import { MessageService } from './message.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('AuthService', () => {
  let service: AuthService;
  let mockOAuthService: jasmine.SpyObj<OAuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let httpMock: HttpTestingController;

  const mockParams = {
    roles: '',
    is_lta: true,
    svc_prov: '',
    depots: '',
    given_name: '',
    user_name: '',
    token: '',
    audience: 'https://localhost:8060',
  };

  beforeEach(() => {
    mockOAuthService = jasmine.createSpyObj('OAuthService', [
      'initImplicitFlow',
      'getAccessToken',
      'loadUserProfile',
      'logOut',
      'revokeTokenAndLogout',
      'setupAutomaticSilentRefresh',
      'loadDiscoveryDocumentAndLogin',
    ]);
    mockRouter = jasmine.createSpyObj('Router', ['navigateByUrl']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);

    TestBed.configureTestingModule({
    imports: [],
    providers: [
        { provide: OAuthService, useValue: mockOAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: MessageService, useValue: mockMessageService },
        AuthService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
});

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call initImplicitFlow on OAuthService', () => {
    service.login();
    expect(mockOAuthService.initImplicitFlow).toHaveBeenCalled();
  });

  it('should save the token to sessionStorage if platform is browser', () => {
    spyOn(sessionStorage, 'setItem');
    service.saveToken('test_token');
    expect(sessionStorage.setItem).toHaveBeenCalledWith('token', 'test_token');
  });

  it('should make an HTTP POST request to generate a token', () => {
    const mockResponse = { access_token: 'fake_token' };

    service.devLogin(mockParams).subscribe(res => {
      expect(res.access_token).toBe('fake_token');
    });

    const req = httpMock.expectOne(`${service['uri']}token/generate`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);

    httpMock.verify();
  });

  it('should handle an error response using MessageService', () => {
    const errorResponse = new ErrorEvent('Network error', {
      message: 'Unable to reach API',
    });

    service.devLogin(mockParams).subscribe({
      error: err => {
        expect(mockMessageService.multiError).toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne(`${service['uri']}token/generate`);
    req.flush(errorResponse);
  });

  it('should clear sessionStorage if useDevSign is true', () => {
    spyOn(sessionStorage, 'clear');
    service['useDevSign'] = true;
    service.logout();
    expect(sessionStorage.clear).toHaveBeenCalled();
  });

  it('should call OAuthService.logout if enableSSO is true', () => {
    service['useDevSign'] = false;
    service['enableSSO'] = true;

    service.logout();
    expect(mockOAuthService.revokeTokenAndLogout).toHaveBeenCalled();
    expect(mockOAuthService.logOut).toHaveBeenCalled();
  });

  it('should return true if token exists', () => {
    spyOn(sessionStorage, 'getItem').and.returnValue('fake_token');
    service['useDevSign'] = true;
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('should return false if no token', () => {
    spyOn(sessionStorage, 'getItem').and.returnValue(null);
    service['useDevSign'] = true;
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should return true if useDevSign is false', () => {
    service['useDevSign'] = false;
    expect(service.isAuthenticated()).toBeTrue();
  });
});
