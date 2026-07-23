import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { InactivityTimeoutService } from './inactivity-timeout.service';
import { AuthService } from './auth.service';

describe('InactivityTimeoutService', () => {
  let service: InactivityTimeoutService;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockStore: jasmine.SpyObj<Store>;

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['logout']);
    mockStore = jasmine.createSpyObj('Store', ['dispatch']);

    TestBed.configureTestingModule({
      providers: [
        InactivityTimeoutService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: Router, useValue: mockRouter },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Store, useValue: mockStore },
      ],
    });

    service = TestBed.inject(InactivityTimeoutService);
  });

  afterEach(() => {
    service.stop();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start the service', () => {
    service.start();
    expect(service.isUserActive()).toBeTrue();
  });

  it('should not start twice', () => {
    service.start();
    service.start(); // second call should be no-op
    expect(service.isUserActive()).toBeTrue();
  });

  it('should stop the service', () => {
    service.start();
    service.stop();
    expect(service.isUserActive()).toBeFalse();
  });

  it('should configure custom timeout', () => {
    service.configure({ timeoutMinutes: 5, warningMinutes: 4 });
    service.start();
    expect(service.getRemainingTimeMinutes()).toBeLessThanOrEqual(5);
  });

  it('should return remaining time in minutes', () => {
    service.start();
    const remaining = service.getRemainingTimeMinutes();
    expect(remaining).toBeGreaterThanOrEqual(0);
    expect(remaining).toBeLessThanOrEqual(30);
  });

  it('should return 0 remaining time when not active', () => {
    expect(service.getRemainingTimeMinutes()).toBe(0);
  });

  it('should reset timer', () => {
    service.start();
    service.resetTimer();
    expect(service.isUserActive()).toBeTrue();
  });

  it('should not reset timer when not active', () => {
    service.resetTimer(); // should be no-op
    expect(service.isUserActive()).toBeFalse();
  });
});
