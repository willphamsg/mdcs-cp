import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@app/services/auth.service';
import { UserService } from '@app/services/user.service';
import { MessageService } from '@app/services/message.service';
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

  beforeEach(waitForAsync(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'login', 'devLogin', 'saveToken', 'saveProfile', 'isDagw', 'getUserRoles',
    ]);
    mockUserService = jasmine.createSpyObj('UserService', ['userProfile']);
    mockMessage = jasmine.createSpyObj('MessageService', ['confirmation']);

    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.getUserRoles.and.returnValue(['sup']);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: MessageService, useValue: mockMessage },
        { provide: CookieService, useValue: jasmine.createSpyObj('CookieService', ['get']) },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
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
});
