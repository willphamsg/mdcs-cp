import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@app/services/auth.service';
import { UserService } from '@app/services/user.service';
import { MessageService } from '@app/services/message.service';
import { PayloadResponse } from '@app/models/common';
import { environment } from '@env/environment';
import { CookieService } from 'ngx-cookie-service';
import { of } from 'rxjs';
import { SignInComponent } from './sign-in.component';

describe('SignInComponent', () => {
  let component: SignInComponent;
  let fixture: ComponentFixture<SignInComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockMessage: jasmine.SpyObj<MessageService>;
  let mockCookieService: jasmine.SpyObj<CookieService>;

  const okResponse = (payload: unknown): PayloadResponse => ({
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'OK',
    payload,
  });

  const errorResponse = (payload: unknown = {}): PayloadResponse => ({
    status: 500,
    status_code: 'ERROR',
    timestamp: Date.now(),
    message: 'fail',
    payload,
  });

  beforeEach(waitForAsync(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'login', 'devLogin', 'saveToken', 'saveProfile', 'isDagw', 'getUserRoles',
    ]);
    mockUserService = jasmine.createSpyObj('UserService', ['userProfile']);
    mockMessage = jasmine.createSpyObj('MessageService', ['confirmation']);
    mockCookieService = jasmine.createSpyObj('CookieService', ['get']);

    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.getUserRoles.and.returnValue(['sup']);
    mockUserService.userProfile.and.returnValue(of(okResponse({})));

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: MessageService, useValue: mockMessage },
        { provide: CookieService, useValue: mockCookieService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      // SignInComponent declares its own `providers: [CookieService]`, which
      // creates a component-level injector that shadows the module-level
      // mock above. Override the component's own providers so the mock is
      // actually the instance the component receives via `inject(CookieService)`.
      .overrideComponent(SignInComponent, {
        set: { providers: [{ provide: CookieService, useValue: mockCookieService }] },
      })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SignInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form on ngOnInit', () => {
    expect(component.form).toBeTruthy();
  });

  it('should have default property values', () => {
    expect(component.loader).toBeFalse();
    expect(component.error).toBe('');
    expect(component.hidePassword).toBeTrue();
  });

  it('should call authService.login on submit when SSO is enabled', () => {
    (component as any).ssoSignIn = true;
    (component as any).useDevSign = false;
    component.submit();
    expect(mockAuthService.login).toHaveBeenCalled();
  });

  it('should redirect based on role', () => {
    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.getUserRoles.and.returnValue(['sup']);
    component.redirectBasedOnRole();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/mdcs/dashboard']);
  });

  it('should redirect admin role to audit log', () => {
    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.getUserRoles.and.returnValue(['adm']);
    component.redirectBasedOnRole();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/mdcs/maintenance/audit-log']);
  });

  it('should redirect dagw admin to change password', () => {
    mockAuthService.isDagw.and.returnValue(true);
    mockAuthService.getUserRoles.and.returnValue(['adm']);
    component.redirectBasedOnRole();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dagw/change-password']);
  });

  it('should redirect maintainer role correctly', () => {
    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.getUserRoles.and.returnValue(['mai']);
    component.redirectBasedOnRole();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/mdcs/import-parameter']);
  });

  it('should redirect dagw maintainer to dagw import-parameter', () => {
    mockAuthService.isDagw.and.returnValue(true);
    mockAuthService.getUserRoles.and.returnValue(['mai']);
    component.redirectBasedOnRole();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dagw/import-parameter']);
  });

  it('should redirect dagw user with no matching role to dagw bus-operation', () => {
    mockAuthService.isDagw.and.returnValue(true);
    mockAuthService.getUserRoles.and.returnValue(['ope']);
    component.redirectBasedOnRole();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dagw/bus-operation']);
  });

  describe('ngOnInit - dev sign token bootstrapping', () => {
    it('should read the JSESSIONTOKEN cookie and apply it when useDevSign is true', () => {
      mockCookieService.get.and.returnValue('cookie-token');
      const applyDevTokenSpy = spyOn(component, 'applyDevToken');

      component.ngOnInit();

      expect(mockCookieService.get).toHaveBeenCalledWith('JSESSIONTOKEN');
      expect(applyDevTokenSpy).toHaveBeenCalledWith('cookie-token');
      expect(component.form.contains('token')).toBeTrue();
    });

    it('should alert when no JSESSIONTOKEN cookie is present', () => {
      mockCookieService.get.and.returnValue('');
      const alertSpy = spyOn(window, 'alert');

      component.ngOnInit();

      expect(alertSpy).toHaveBeenCalledWith('Token invalid or expired');
    });

    it('should build a Login form and skip cookie lookup when useDevSign is false', () => {
      (component as any).useDevSign = false;
      mockCookieService.get.calls.reset();

      component.ngOnInit();

      expect(component.form.contains('username')).toBeTrue();
      expect(component.form.contains('password')).toBeTrue();
      expect(mockCookieService.get).not.toHaveBeenCalled();
    });
  });

  describe('submit() - devLogin flow (useDevSign=true)', () => {
    beforeEach(() => {
      (component as any).ssoSignIn = false;
      (component as any).useDevSign = true;
    });

    it('should save token, save profile, and redirect when devLogin + profile succeed', () => {
      const profile = { access_token_profile: { roles: ['sup'] } };
      mockAuthService.devLogin.and.returnValue(of({ token: 'tok123' }));
      mockUserService.userProfile.and.returnValue(of(okResponse(profile)));
      const redirectSpy = spyOn(component, 'redirectBasedOnRole');

      component.submit();

      expect(mockAuthService.devLogin).toHaveBeenCalledWith(component.form.value);
      expect(mockAuthService.saveToken).toHaveBeenCalledWith('tok123');
      expect(mockAuthService.saveProfile).toHaveBeenCalledWith(profile as any);
      expect(redirectSpy).toHaveBeenCalled();
    });

    it('should not save profile or redirect when the devLogin profile status is not 200', () => {
      mockAuthService.devLogin.and.returnValue(of({ token: 'tok123' }));
      mockUserService.userProfile.and.returnValue(of(errorResponse()));
      const redirectSpy = spyOn(component, 'redirectBasedOnRole');

      component.submit();

      expect(mockAuthService.saveProfile).not.toHaveBeenCalled();
      expect(redirectSpy).not.toHaveBeenCalled();
    });

    it('should also invoke SSO login when both ssoSignIn and useDevSign are enabled', () => {
      (component as any).ssoSignIn = true;
      mockAuthService.devLogin.and.returnValue(of({ token: 'tok123' }));
      mockUserService.userProfile.and.returnValue(of(okResponse({})));

      component.submit();

      expect(mockAuthService.login).toHaveBeenCalled();
      expect(mockAuthService.devLogin).toHaveBeenCalled();
    });
  });

  describe('submit() - non-dev, non-dummy flow (useDevSign=false, useDummyData=false)', () => {
    const originalUseDummyData = environment.useDummyData;

    beforeEach(() => {
      environment.useDummyData = false;
      (component as any).ssoSignIn = false;
      (component as any).useDevSign = false;
      component.ngOnInit();
    });

    afterEach(() => {
      environment.useDummyData = originalUseDummyData;
    });

    it('should store svc_prov_id and redirect immediately without calling userProfile', () => {
      component.form.patchValue({ username: 'foo', password: 'bar', svc_prov_id: '9' });
      const redirectSpy = spyOn(component, 'redirectBasedOnRole');
      const setItemSpy = spyOn(sessionStorage, 'setItem');

      component.submit();

      expect(setItemSpy).toHaveBeenCalledWith('svdProvId', '9');
      expect(redirectSpy).toHaveBeenCalled();
      expect(mockUserService.userProfile).not.toHaveBeenCalled();
    });
  });

  describe('submit() - dummy data flow (useDevSign=false, useDummyData=true)', () => {
    const originalUseDummyData = environment.useDummyData;

    beforeEach(() => {
      environment.useDummyData = true;
      (component as any).ssoSignIn = false;
      (component as any).useDevSign = false;
      component.ngOnInit();
    });

    afterEach(() => {
      environment.useDummyData = originalUseDummyData;
    });

    it('should return early without calling userProfile when the password does not match', () => {
      component.form.patchValue({ username: 'admin', password: 'wrong', svc_prov_id: '1' });

      component.submit();

      expect(mockUserService.userProfile).not.toHaveBeenCalled();
    });

    it('should skip userProfile for a username outside the allowed list', () => {
      component.form.patchValue({ username: 'randomuser', password: 'password', svc_prov_id: '1' });

      component.submit();

      expect(mockUserService.userProfile).not.toHaveBeenCalled();
    });

    it('should not save profile or redirect when the userProfile status is not 200', () => {
      mockUserService.userProfile.and.returnValue(of(errorResponse()));
      const redirectSpy = spyOn(component, 'redirectBasedOnRole');
      component.form.patchValue({ username: 'admin', password: 'password', svc_prov_id: '1' });

      component.submit();

      expect(mockAuthService.saveProfile).not.toHaveBeenCalled();
      expect(redirectSpy).not.toHaveBeenCalled();
    });

    const cases: { username: string; role: string; givenName: string; isLta?: boolean }[] = [
      { username: 'admin', role: 'adm', givenName: 'Administrator' },
      { username: 'maintainer', role: 'mai', givenName: 'Maintainer' },
      { username: 'supervisor', role: 'sup', givenName: 'Supervisor' },
      { username: 'lta-sup', role: 'sup', givenName: 'LTA Supervisor', isLta: true },
      { username: 'operator', role: 'ope', givenName: 'Operator' },
    ];

    for (const { username, role, givenName, isLta } of cases) {
      it(`should tailor the profile and redirect for username "${username}"`, () => {
        const profile: any = { access_token_profile: { roles: [], given_name: '' } };
        mockUserService.userProfile.and.returnValue(of(okResponse(profile)));
        const redirectSpy = spyOn(component, 'redirectBasedOnRole');
        component.form.patchValue({ username, password: 'password', svc_prov_id: '1' });

        component.submit();

        expect(profile.access_token_profile.roles).toEqual([role]);
        expect(profile.access_token_profile.given_name).toBe(givenName);
        if (isLta) {
          expect(profile.access_token_profile.is_lta).toBeTrue();
        }
        expect(mockAuthService.saveProfile).toHaveBeenCalledWith(profile);
        expect(redirectSpy).toHaveBeenCalled();
      });
    }
  });

  describe('applyToken', () => {
    it('should save token, save profile, and redirect when userProfile status is 200', () => {
      component.form.patchValue({ token: 'abc' });
      const profile = { access_token_profile: { roles: ['sup'] } };
      mockUserService.userProfile.and.returnValue(of(okResponse(profile)));
      const redirectSpy = spyOn(component, 'redirectBasedOnRole');

      component.applyToken();

      expect(mockAuthService.saveToken).toHaveBeenCalledWith('abc');
      expect(mockAuthService.saveProfile).toHaveBeenCalledWith(profile as any);
      expect(redirectSpy).toHaveBeenCalled();
    });

    it('should not save profile or redirect when userProfile status is not 200', () => {
      component.form.patchValue({ token: 'abc' });
      mockUserService.userProfile.and.returnValue(of(errorResponse()));
      const redirectSpy = spyOn(component, 'redirectBasedOnRole');

      component.applyToken();

      expect(mockAuthService.saveProfile).not.toHaveBeenCalled();
      expect(redirectSpy).not.toHaveBeenCalled();
    });
  });

  describe('applyDevToken', () => {
    it('should save the token, save profile, and redirect for a valid token with a 200 profile', () => {
      const profile = { access_token_profile: { roles: ['sup'] } };
      mockUserService.userProfile.and.returnValue(of(okResponse(profile)));
      const redirectSpy = spyOn(component, 'redirectBasedOnRole');

      component.applyDevToken('some-token');

      expect(mockAuthService.saveToken).toHaveBeenCalledWith('some-token');
      expect(mockAuthService.saveProfile).toHaveBeenCalledWith(profile as any);
      expect(redirectSpy).toHaveBeenCalled();
    });

    it('should not save profile when the profile status is not 200', () => {
      mockUserService.userProfile.and.returnValue(of(errorResponse()));

      component.applyDevToken('some-token');

      expect(mockAuthService.saveProfile).not.toHaveBeenCalled();
    });

    it('should alert and skip saveToken for an empty token string', () => {
      const alertSpy = spyOn(window, 'alert');
      mockAuthService.saveToken.calls.reset();

      component.applyDevToken('');

      expect(alertSpy).toHaveBeenCalledWith('Token invalid or expired');
      expect(mockAuthService.saveToken).not.toHaveBeenCalled();
    });

    it('should alert for an undefined token', () => {
      const alertSpy = spyOn(window, 'alert');

      component.applyDevToken(undefined as unknown as string);

      expect(alertSpy).toHaveBeenCalledWith('Token invalid or expired');
    });

    it('should alert for a null token', () => {
      const alertSpy = spyOn(window, 'alert');

      component.applyDevToken(null as unknown as string);

      expect(alertSpy).toHaveBeenCalledWith('Token invalid or expired');
    });
  });
});
