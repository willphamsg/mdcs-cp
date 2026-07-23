import { Injectable, inject, NgZone, PLATFORM_ID } from '@angular/core';
import { AuthService } from './auth.service';
import { Store } from '@ngrx/store';
import { AppStore } from '@app/store/app.state';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';
import { isPlatformBrowser } from '@angular/common';
import { fromEvent, merge, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class InactivityTimeoutService {
  private readonly TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
  private readonly WARNING_DURATION = 28 * 60 * 1000; // 28 minutes warning
  private readonly CHECK_INTERVAL = 60 * 1000; // Check every minute

  // For testing purposes - can be overridden
  private timeoutDuration = this.TIMEOUT_DURATION;
  private warningDuration = this.WARNING_DURATION;

  private timeoutTimer?: ReturnType<typeof setTimeout>;
  private warningTimer?: ReturnType<typeof setTimeout>;
  private lastActivity = Date.now();
  private isActive = false;
  private destroy$ = new Subject<void>();

  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly authService = inject(AuthService);
  private readonly store = inject(Store<AppStore>);

  // Configuration method for testing
  configure(options: {
    timeoutMinutes?: number;
    warningMinutes?: number;
  }): void {
    if (options.timeoutMinutes) {
      this.timeoutDuration = options.timeoutMinutes * 60 * 1000;
    }
    if (options.warningMinutes) {
      this.warningDuration = options.warningMinutes * 60 * 1000;
    }
  }

  start(): void {
    if (!isPlatformBrowser(this.platformId) || this.isActive) {
      return;
    }

    this.isActive = true;
    this.lastActivity = Date.now();
    this.setupActivityListeners();
    this.startTimeoutCheckers();
  }

  stop(): void {
    this.isActive = false;
    this.clearTimers();
    this.destroy$.next();
    this.destroy$.complete();
  }

  resetTimer(): void {
    if (!this.isActive) return;

    this.lastActivity = Date.now();
    this.clearTimers();
    this.startTimeoutCheckers();
  }

  private setupActivityListeners(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Listen to user activity events
    const activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Create observables for each event type
    const eventStreams = activityEvents.map(event =>
      fromEvent(document, event)
    );

    // Merge all activity events and debounce to avoid excessive updates
    merge(...eventStreams)
      .pipe(
        debounceTime(1000), // Debounce activity events by 1 second
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.resetTimer();
      });
  }

  private startTimeoutCheckers(): void {
    // Set warning timer (28 minutes)
    this.warningTimer = setTimeout(() => {
      this.showWarning();
    }, this.warningDuration);

    // Set timeout timer (30 minutes)
    this.timeoutTimer = setTimeout(() => {
      this.handleTimeout();
    }, this.timeoutDuration);
  }

  private showWarning(): void {
    console.log('⚠️ Showing inactivity warning...');
    this.store.dispatch(
      showSnackbar({
        message:
          'Your session will expire in 2 minutes due to inactivity. Please perform any action to extend your session.',
        title: 'Session Warning',
        typeSnackbar: 'warning',
        duration: 10000, // Show warning for 10 seconds
      })
    );
  }

  private handleTimeout(): void {
    console.log('🚨 Handling session timeout...');
    // Stop the service
    this.stop();

    // Logout user and redirect to login page with full page reload
    this.ngZone.run(() => {
      this.authService.logout();

      // Use window.location.href to force a full page reload,
      // clearing all SPA state and redirecting to the login page
      window.location.href = '/identification/login.html';
    });
  }

  private clearTimers(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = undefined;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = undefined;
    }
  }

  // Public method to check if user is still active
  isUserActive(): boolean {
    return (
      this.isActive && Date.now() - this.lastActivity < this.timeoutDuration
    );
  }

  // Get remaining time in minutes
  getRemainingTimeMinutes(): number {
    if (!this.isActive) return 0;
    const elapsed = Date.now() - this.lastActivity;
    const remaining = this.timeoutDuration - elapsed;
    return Math.max(0, Math.floor(remaining / (60 * 1000)));
  }
} 