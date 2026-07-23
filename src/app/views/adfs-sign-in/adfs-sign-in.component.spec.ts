import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '@app/services/auth.service';
import { UserService } from '@app/services/user.service';
import { of, Subject } from 'rxjs';
import { AdfsSignInComponent } from './adfs-sign-in.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { PayloadResponse } from '@app/models/common';

describe('AdfsSignInComponent', () => {
  let component: AdfsSignInComponent;
  let fixture: ComponentFixture<AdfsSignInComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let queryParamsSubject: Subject<any>;

  const mockProfileResponse: PayloadResponse = {
    status: 200,
    status_code: 'SUCCESS',
    timestamp: Date.now(),
    message: 'OK',
    payload: { user_name: 'test', roles: ['ope'] },
  };

  beforeEach(waitForAsync(() => {
    queryParamsSubject = new Subject();

    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isDagw',
      'saveToken',
      'saveProfile',
      'getUserRoles',
      'getSVCProvider',
    ]);
    mockUserService = jasmine.createSpyObj('UserService', ['userProfile']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    mockAuthService.isDagw.and.returnValue(true);
    mockAuthService.getUserRoles.and.returnValue(['ope']);
    mockUserService.userProfile.and.returnValue(of(mockProfileResponse));

    TestBed.configureTestingModule({
      imports: [AdfsSignInComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: { queryParams: queryParamsSubject.asObservable() },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AdfsSignInComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call applyDevToken when queryParams emit a token', () => {
    spyOn(component, 'applyDevToken');
    fixture.detectChanges();
    queryParamsSubject.next({ token: 'test-token' });
    expect(component.applyDevToken).toHaveBeenCalledWith('test-token');
  });

  it('should save token and profile on valid token', () => {
    fixture.detectChanges();
    component.applyDevToken('valid-token');
    expect(mockAuthService.saveToken).toHaveBeenCalledWith('valid-token');
    expect(mockUserService.userProfile).toHaveBeenCalled();
  });

  it('should redirect dagw admin to change-password', () => {
    mockAuthService.isDagw.and.returnValue(true);
    mockAuthService.getUserRoles.and.returnValue(['adm']);
    fixture.detectChanges();
    component.applyDevToken('valid-token');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dagw/change-password']);
  });

  it('should redirect mdcs admin to audit-log', () => {
    mockAuthService.isDagw.and.returnValue(false);
    mockAuthService.getUserRoles.and.returnValue(['adm']);
    fixture.detectChanges();
    component.applyDevToken('valid-token');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/mdcs/maintenance/audit-log']);
  });

  it('should redirect dagw mai role to import-parameter', () => {
    mockAuthService.isDagw.and.returnValue(true);
    mockAuthService.getUserRoles.and.returnValue(['mai']);
    fixture.detectChanges();
    component.applyDevToken('valid-token');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dagw/import-parameter']);
  });

  it('should redirect dagw ope/sup role to bus-operation', () => {
    mockAuthService.isDagw.and.returnValue(true);
    mockAuthService.getUserRoles.and.returnValue(['sup']);
    fixture.detectChanges();
    component.applyDevToken('valid-token');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dagw/bus-operation']);
  });

  it('should redirect to default dagw route when no matching role', () => {
    mockAuthService.isDagw.and.returnValue(true);
    mockAuthService.getUserRoles.and.returnValue(['unknown']);
    fixture.detectChanges();
    component.applyDevToken('valid-token');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dagw/bus-operation']);
  });

  it('should alert when token is empty', () => {
    spyOn(window, 'alert');
    fixture.detectChanges();
    component.applyDevToken('');
    expect(window.alert).toHaveBeenCalledWith('Token invalid or expired');
    expect(mockAuthService.saveToken).not.toHaveBeenCalled();
  });

  it('should alert when token is undefined', () => {
    spyOn(window, 'alert');
    fixture.detectChanges();
    component.applyDevToken(undefined as any);
    expect(window.alert).toHaveBeenCalledWith('Token invalid or expired');
  });
});
