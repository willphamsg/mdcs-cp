import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OAuthService } from 'angular-oauth2-oidc';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { MessageService } from './message.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { environment } from '../../environments/environment';

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
      'hasValidAccessToken',
      'configure',
    ]);
    mockOAuthService.hasValidAccessToken.and.returnValue(false);
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
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
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
      error: () => {
        expect(mockMessageService.multiError).toHaveBeenCalled();
      },
    });

    const req = httpMock.expectOne(`${service['uri']}token/generate`);
    req.flush(errorResponse);
  });

  it('should clear sessionStorage if useDevSign is true', () => {
    spyOn(sessionStorage, 'clear');
    (service as any)['useDevSign'] = true;
    service.logout();
    expect(sessionStorage.clear).toHaveBeenCalled();
  });

  it('should call OAuthService.logout if enableSSO is true', () => {
    (service as any)['useDevSign'] = false;
    (service as any)['enableSSO'] = true;

    service.logout();
    expect(mockOAuthService.revokeTokenAndLogout).toHaveBeenCalled();
    expect(mockOAuthService.logOut).toHaveBeenCalled();
  });

  it('should return true if token exists', () => {
    spyOn(sessionStorage, 'getItem').and.returnValue('fake_token');
    (service as any)['useDevSign'] = true;
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('should return false if no token', () => {
    spyOn(sessionStorage, 'getItem').and.returnValue(null);
    (service as any)['useDevSign'] = true;
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should return true if useDevSign is false', () => {
    (service as any)['useDevSign'] = false;
    expect(service.isAuthenticated()).toBeTrue();
  });

  describe('getToken / getSVCProvider (useDevSign branches)', () => {
    it('getToken should read from sessionStorage when useDevSign is true', () => {
      (service as any)['useDevSign'] = true;
      sessionStorage.setItem('token', 'abc');
      expect(service.getToken()).toBe('abc');
    });

    it('getToken should delegate to OAuthService when useDevSign is false', () => {
      (service as any)['useDevSign'] = false;
      mockOAuthService.getAccessToken.and.returnValue('oauth-token');
      expect(service.getToken()).toBe('oauth-token');
      expect(mockOAuthService.getAccessToken).toHaveBeenCalled();
    });

    it('getSVCProvider should read from sessionStorage when useDevSign is true', () => {
      (service as any)['useDevSign'] = true;
      sessionStorage.setItem('svdProvId', '99');
      expect(service.getSVCProvider()).toBe('99');
    });

    it('getSVCProvider should delegate to OAuthService.getAccessToken when useDevSign is false', () => {
      (service as any)['useDevSign'] = false;
      mockOAuthService.getAccessToken.and.returnValue('oauth-token-2');
      expect(service.getSVCProvider()).toBe('oauth-token-2');
    });
  });

  describe('saveRefreshToken / getRefreshToken', () => {
    it('should save the refresh token to sessionStorage and cookie', () => {
      service.saveRefreshToken('refresh-abc');
      expect(sessionStorage.getItem('refresh_token')).toBe('refresh-abc');
    });

    it('should return the refresh token from sessionStorage when present', () => {
      sessionStorage.setItem('refresh_token', 'refresh-xyz');
      expect(service.getRefreshToken()).toBe('refresh-xyz');
    });

    it('should return an empty string when no refresh token is stored', () => {
      sessionStorage.removeItem('refresh_token');
      expect(service.getRefreshToken()).toBe('');
    });
  });

  describe('saveProfile / fetchProfile', () => {
    it('should persist the profile and svdProvId to sessionStorage', () => {
      const profile: any = {
        access_token_profile: { svc_prov: 5 },
      };
      service.saveProfile(profile);
      expect(sessionStorage.getItem('svdProvId')).toBe('5');
      expect(JSON.parse(sessionStorage.getItem('profile')!)).toEqual(profile);
    });

    it('fetchProfile should return {} when nothing stored', () => {
      sessionStorage.removeItem('profile');
      expect(service.fetchProfile()).toEqual({});
    });

    it('fetchProfile should return the parsed profile when stored', () => {
      const profile = { foo: 'bar' };
      sessionStorage.setItem('profile', JSON.stringify(profile));
      expect(service.fetchProfile()).toEqual(profile);
    });
  });

  describe('getRolesAccess', () => {
    it('should return {} when the profile has no roles array', () => {
      sessionStorage.removeItem('profile');
      expect(service.getRolesAccess('vehicle-map')).toEqual({});
    });

    it('should return the access object for a matching role + module', () => {
      const profile = {
        access_token_profile: { roles: ['ope'] },
      };
      sessionStorage.setItem('profile', JSON.stringify(profile));
      const access = service.getRolesAccess('vehicle-map');
      expect(access).toEqual(
        jasmine.objectContaining({ search: true, print: true, export: true })
      );
    });

    it('should return undefined when no role entry matches', () => {
      const profile = {
        access_token_profile: { roles: ['unknown-role'] },
      };
      sessionStorage.setItem('profile', JSON.stringify(profile));
      expect(service.getRolesAccess('vehicle-map')).toBeUndefined();
    });

    it('should return undefined when the role matches but module does not', () => {
      const profile = {
        access_token_profile: { roles: ['ope'] },
      };
      sessionStorage.setItem('profile', JSON.stringify(profile));
      expect(service.getRolesAccess('does-not-exist')).toBeUndefined();
    });
  });

  describe('getUserRoles', () => {
    it('should return the roles array from the profile', () => {
      sessionStorage.setItem(
        'profile',
        JSON.stringify({ access_token_profile: { roles: ['sup', 'ope'] } })
      );
      expect(service.getUserRoles()).toEqual(['sup', 'ope']);
    });

    it('should return an empty array when there is no profile', () => {
      sessionStorage.removeItem('profile');
      expect(service.getUserRoles()).toEqual([]);
    });
  });

  describe('hasAccess', () => {
    it('should return false when the user has no roles', () => {
      sessionStorage.removeItem('profile');
      expect(service.hasAccess(['dashboard', 'home', 'view'], 'mdcs')).toBeFalse();
    });

    it('should return true when the user role is included in the menu access path', () => {
      sessionStorage.setItem(
        'profile',
        JSON.stringify({ access_token_profile: { roles: ['sup'] } })
      );
      expect(service.hasAccess(['dashboard', 'home', 'view'], 'mdcs')).toBeTrue();
    });

    it('should return false when the user role is not included', () => {
      sessionStorage.setItem(
        'profile',
        JSON.stringify({ access_token_profile: { roles: ['mai'] } })
      );
      expect(service.hasAccess(['dashboard', 'home', 'manage'], 'mdcs')).toBeFalse();
    });

    it('should return false when the path does not resolve to an array', () => {
      sessionStorage.setItem(
        'profile',
        JSON.stringify({ access_token_profile: { roles: ['sup'] } })
      );
      expect(service.hasAccess(['does', 'not', 'exist'], 'mdcs')).toBeFalse();
    });
  });

  describe('getValidAccess', () => {
    it('should return true when access is undefined', () => {
      expect(service.getValidAccess(['a'], undefined as any)).toBeTrue();
    });

    it('should return true when access is null', () => {
      expect(service.getValidAccess(['a'], null as any)).toBeTrue();
    });

    it('should return true when every requested right is truthy', () => {
      expect(
        service.getValidAccess(['a', 'b'], { a: true, b: true } as any)
      ).toBeTrue();
    });

    it('should return the falsy right when a requested right is falsy', () => {
      expect(
        service.getValidAccess(['a', 'b'], { a: true, b: false } as any)
      ).toBeFalse();
    });
  });

  describe('getSessionProfile', () => {
    it('should return the parsed profile from sessionStorage', () => {
      const profile = { access_token_profile: { roles: ['sup'] } };
      sessionStorage.setItem('profile', JSON.stringify(profile));
      expect(service.getSessionProfile()).toEqual(profile as any);
    });

    it('should return {} when nothing is stored', () => {
      sessionStorage.removeItem('profile');
      expect(service.getSessionProfile()).toEqual({} as any);
    });
  });

  describe('isDagw / isLTA / getAppMode', () => {
    it('isDagw should return true when app_mode is "dagw" (any case)', () => {
      sessionStorage.setItem('profile', JSON.stringify({ app_mode: 'DAGW' }));
      expect(service.isDagw()).toBeTrue();
    });

    it('isDagw should return false when app_mode is something else', () => {
      sessionStorage.setItem('profile', JSON.stringify({ app_mode: 'mdcs' }));
      expect(service.isDagw()).toBeFalse();
    });

    it('isDagw should return false when app_mode is missing', () => {
      sessionStorage.removeItem('profile');
      expect(service.isDagw()).toBeFalse();
    });

    it('getAppMode should lowercase a string app_mode', () => {
      sessionStorage.setItem('profile', JSON.stringify({ app_mode: 'MDCS' }));
      expect(service.getAppMode()).toBe('mdcs');
    });

    it('getAppMode should return null when app_mode is not a string', () => {
      sessionStorage.setItem('profile', JSON.stringify({}));
      expect(service.getAppMode()).toBeNull();
    });

    it('isLTA should return true when profile.isLTA is true', () => {
      sessionStorage.setItem('profile', JSON.stringify({ isLTA: true }));
      expect(service.isLTA()).toBeTrue();
    });

    it('isLTA should return true when access_token_profile.is_lta is true', () => {
      sessionStorage.setItem(
        'profile',
        JSON.stringify({ access_token_profile: { is_lta: true } })
      );
      expect(service.isLTA()).toBeTrue();
    });

    it('isLTA should return false when neither flag is true', () => {
      sessionStorage.setItem('profile', JSON.stringify({}));
      expect(service.isLTA()).toBeFalse();
    });
  });

  describe('isWebSocketEnabled / wsUrl', () => {
    it('should use the profile boolean when is_websocket_enabled is a boolean', () => {
      sessionStorage.setItem(
        'profile',
        JSON.stringify({ is_websocket_enabled: false })
      );
      expect(service.isWebSocketEnabled()).toBeFalse();
    });

    it('should fall back to environment.webSocketEnabled when profile value is not boolean', () => {
      sessionStorage.setItem('profile', JSON.stringify({}));
      expect(service.isWebSocketEnabled()).toBe(environment.webSocketEnabled);
    });

    it('should use the profile websocket_url when it is a string', () => {
      sessionStorage.setItem(
        'profile',
        JSON.stringify({ websocket_url: 'wss://custom/ws' })
      );
      expect(service.wsUrl()).toBe('wss://custom/ws');
    });

    it('should fall back to environment.wsUrl when profile value is not a string', () => {
      sessionStorage.setItem('profile', JSON.stringify({}));
      expect(service.wsUrl()).toBe(environment.wsUrl || null);
    });
  });

  describe('getServiceProviderId', () => {
    it('should return svc_prov from the profile', () => {
      sessionStorage.setItem(
        'profile',
        JSON.stringify({ access_token_profile: { svc_prov: 42 } })
      );
      expect(service.getServiceProviderId()).toBe(42);
    });
  });

  describe('getUsername / getDefaultDepot / getCDALink / getSvcProvCode', () => {
    it('should return values from the profile when present', () => {
      sessionStorage.setItem(
        'profile',
        JSON.stringify({
          access_token_profile: { user_name: 'jdoe' },
          default_depot: 7,
          cda_link_url: 'http://cda',
          default_svc_prov_code: 'SP1',
        })
      );
      expect(service.getUsername()).toBe('jdoe');
      expect(service.getDefaultDepot()).toBe(7);
      expect(service.getCDALink()).toBe('http://cda');
      expect(service.getSvcProvCode()).toBe('SP1');
    });

    it('should return null for default depot / cda link / svc prov code when missing', () => {
      sessionStorage.setItem(
        'profile',
        JSON.stringify({ access_token_profile: {} })
      );
      expect(service.getDefaultDepot()).toBeNull();
      expect(service.getCDALink()).toBeNull();
      expect(service.getSvcProvCode()).toBeNull();
    });
  });

  describe('ssoConfiguration', () => {
    it('should configure OAuthService and set up automatic silent refresh', () => {
      mockOAuthService.loadDiscoveryDocumentAndLogin.and.returnValue(
        Promise.resolve(true)
      );
      service.ssoConfiguration();
      expect(mockOAuthService.configure).toHaveBeenCalled();
      expect(mockOAuthService.setupAutomaticSilentRefresh).toHaveBeenCalled();
    });

    it('should mark loading as done and navigate when discovery resolves with a state starting with "/"', async () => {
      mockOAuthService.state = '/some/path';
      mockOAuthService.hasValidAccessToken.and.returnValue(true);
      mockOAuthService.loadDiscoveryDocumentAndLogin.and.returnValue(
        Promise.resolve(true)
      );

      service.ssoConfiguration();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/some/path');
    });

    it('should decode the state url when it does not start with "/"', async () => {
      mockOAuthService.state = 'foo%2Fbar';
      mockOAuthService.hasValidAccessToken.and.returnValue(true);
      mockOAuthService.loadDiscoveryDocumentAndLogin.and.returnValue(
        Promise.resolve(true)
      );

      service.ssoConfiguration();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('foo/bar');
    });

    it('should not navigate when state is "undefined"', async () => {
      mockOAuthService.state = 'undefined';
      mockOAuthService.loadDiscoveryDocumentAndLogin.and.returnValue(
        Promise.resolve(true)
      );

      service.ssoConfiguration();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
    });

    it('should not navigate when state is "null"', async () => {
      mockOAuthService.state = 'null';
      mockOAuthService.loadDiscoveryDocumentAndLogin.and.returnValue(
        Promise.resolve(true)
      );

      service.ssoConfiguration();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
    });

    it('should not navigate when state is falsy', async () => {
      mockOAuthService.state = '';
      mockOAuthService.loadDiscoveryDocumentAndLogin.and.returnValue(
        Promise.resolve(true)
      );

      service.ssoConfiguration();
      await Promise.resolve();
      await Promise.resolve();

      expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
    });

    it('should still mark loading as done when discovery document login rejects', async () => {
      mockOAuthService.hasValidAccessToken.and.returnValue(false);
      mockOAuthService.loadDiscoveryDocumentAndLogin.and.returnValue(
        Promise.reject('boom')
      );

      let doneEmitted = false;
      service.isDoneLoading$.subscribe(() => (doneEmitted = true));

      service.ssoConfiguration();
      await Promise.resolve();
      await Promise.resolve();

      expect(doneEmitted).toBeTrue();
    });
  });

  describe('getProfile / updatePassword', () => {
    it('getProfile should call loadUserProfile', async () => {
      mockOAuthService.loadUserProfile.and.returnValue(
        Promise.resolve({ info: { unique_name: 'jdoe' } })
      );
      service.getProfile();
      await Promise.resolve();
      expect(mockOAuthService.loadUserProfile).toHaveBeenCalled();
    });

    it('updatePassword should open a new window with the update-password URL', async () => {
      spyOn(window, 'open');
      mockOAuthService.loadUserProfile.and.returnValue(
        Promise.resolve({ info: { unique_name: 'jdoe' } })
      );
      service.updatePassword();
      await Promise.resolve();
      expect(window.open).toHaveBeenCalledWith(
        jasmine.stringMatching(/UserName=jdoe/),
        '_blank'
      );
    });
  });
});

describe('AuthService - non-browser platform (SSR)', () => {
  let service: AuthService;
  let mockOAuthService: jasmine.SpyObj<OAuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  beforeEach(() => {
    mockOAuthService = jasmine.createSpyObj('OAuthService', [
      'initImplicitFlow',
      'getAccessToken',
      'loadUserProfile',
      'logOut',
      'revokeTokenAndLogout',
      'setupAutomaticSilentRefresh',
      'loadDiscoveryDocumentAndLogin',
      'hasValidAccessToken',
      'configure',
    ]);
    mockRouter = jasmine.createSpyObj('Router', ['navigateByUrl']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);

    TestBed.configureTestingModule({
      providers: [
        { provide: OAuthService, useValue: mockOAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: MessageService, useValue: mockMessageService },
        { provide: PLATFORM_ID, useValue: 'server' },
        AuthService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
  });

  it('should not throw during construction on the server platform', () => {
    expect(service).toBeTruthy();
  });

  it('getToken should return an empty string when useDevSign is true and not on browser', () => {
    (service as any)['useDevSign'] = true;
    expect(service.getToken()).toBe('');
  });

  it('getSVCProvider should return an empty string when useDevSign is true and not on browser', () => {
    (service as any)['useDevSign'] = true;
    expect(service.getSVCProvider()).toBe('');
  });

  it('getRefreshToken should return an empty string on the server', () => {
    expect(service.getRefreshToken()).toBe('');
  });

  it('fetchProfile should return {} on the server', () => {
    expect(service.fetchProfile()).toEqual({});
  });

  it('getSessionProfile should return {} on the server', () => {
    expect(service.getSessionProfile()).toEqual({} as any);
  });

  it('saveToken should not throw on the server', () => {
    expect(() => service.saveToken('t')).not.toThrow();
  });

  it('saveRefreshToken should not throw on the server', () => {
    expect(() => service.saveRefreshToken('t')).not.toThrow();
  });

  it('saveProfile should not throw on the server', () => {
    expect(() => service.saveProfile({} as any)).not.toThrow();
  });
});

describe('AuthService - SSO mode constructor', () => {
  let service: AuthService;
  let mockOAuthService: jasmine.SpyObj<OAuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let eventsSubject: Subject<any>;
  let previousEnableSSO: boolean;

  beforeEach(() => {
    previousEnableSSO = environment.enableSSO;
    (environment as any).enableSSO = true;

    eventsSubject = new Subject<any>();
    mockOAuthService = jasmine.createSpyObj('OAuthService', [
      'initImplicitFlow',
      'getAccessToken',
      'loadUserProfile',
      'logOut',
      'revokeTokenAndLogout',
      'setupAutomaticSilentRefresh',
      'loadDiscoveryDocumentAndLogin',
      'hasValidAccessToken',
      'configure',
    ]);
    mockOAuthService.hasValidAccessToken.and.returnValue(true);
    mockOAuthService.loadDiscoveryDocumentAndLogin.and.returnValue(
      Promise.resolve(true)
    );
    (mockOAuthService as any).events = eventsSubject;

    mockRouter = jasmine.createSpyObj('Router', ['navigateByUrl']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['multiError']);

    TestBed.configureTestingModule({
      providers: [
        { provide: OAuthService, useValue: mockOAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: MessageService, useValue: mockMessageService },
        AuthService,
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    (environment as any).enableSSO = previousEnableSSO;
  });

  it('should configure SSO and set the initial authenticated state from a valid token', () => {
    expect(mockOAuthService.configure).toHaveBeenCalled();
    expect(service).toBeTruthy();
  });

  it('should update isAuthenticated and navigate to login when the access_token storage key changes and the token is no longer valid', () => {
    mockOAuthService.hasValidAccessToken.and.returnValue(false);

    let latest: boolean | undefined;
    service.isAuthenticated$.subscribe(v => (latest = v));

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'access_token' })
    );

    expect(latest).toBeFalse();
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should treat a null storage key (e.g. from .clear()) the same as access_token', () => {
    mockOAuthService.hasValidAccessToken.and.returnValue(false);

    window.dispatchEvent(new StorageEvent('storage', { key: null }));

    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should ignore storage events for unrelated keys', () => {
    mockRouter.navigateByUrl.calls.reset();
    mockOAuthService.hasValidAccessToken.calls.reset();

    window.dispatchEvent(
      new StorageEvent('storage', { key: 'some_other_key' })
    );

    expect(mockOAuthService.hasValidAccessToken).not.toHaveBeenCalled();
    expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
  });

  it('should update isAuthenticated when OAuthService emits an event', () => {
    mockOAuthService.hasValidAccessToken.and.returnValue(true);

    let latest: boolean | undefined;
    service.isAuthenticated$.subscribe(v => (latest = v));

    eventsSubject.next({ type: 'token_received' });

    expect(latest).toBeTrue();
  });

  it('should navigate to login on session_terminated events', () => {
    eventsSubject.next({ type: 'session_terminated' });
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should navigate to login on session_error events', () => {
    eventsSubject.next({ type: 'session_error' });
    expect(mockRouter.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should not navigate for unrelated event types', () => {
    mockRouter.navigateByUrl.calls.reset();
    eventsSubject.next({ type: 'token_refreshed' });
    expect(mockRouter.navigateByUrl).not.toHaveBeenCalled();
  });
});
