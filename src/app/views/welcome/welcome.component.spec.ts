import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@app/services/auth.service';
import { UserService } from '@app/services/user.service';
import { EMPTY, of } from 'rxjs';
import { WelComeComponent } from './welcome.component';

describe('WelComeComponent', () => {
  let component: WelComeComponent;
  let fixture: ComponentFixture<WelComeComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockUserService: jasmine.SpyObj<UserService>;

  beforeEach(waitForAsync(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'login', 'devLogin', 'saveToken', 'saveProfile', 'isDagw',
    ]);
    mockUserService = jasmine.createSpyObj('UserService', ['userProfile']);
    mockUserService.userProfile.and.returnValue(EMPTY);

    TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule, ReactiveFormsModule],
      providers: [
        FormBuilder,
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(WelComeComponent);
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

  it('should save token on applyToken', () => {
    component.form.patchValue({ token: 'test-token' });
    mockUserService.userProfile.and.returnValue(of({
      status: 200, status_code: 'SUCCESS', timestamp: Date.now(), message: 'OK',
      payload: {
        access_token_profile: { roles: ['sup'], given_name: 'Test', is_lta: false },
      },
    }));
    component.applyToken();
    expect(mockAuthService.saveToken).toHaveBeenCalledWith('test-token');
  });
});
