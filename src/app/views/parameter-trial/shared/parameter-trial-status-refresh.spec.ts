import { fakeAsync, flush, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { WebSocketService, WS_TOPICS } from '@app/services/web-socket.service';
import { ParameterTrialStatusRefresh } from './parameter-trial-status-refresh';

describe('ParameterTrialStatusRefresh', () => {
  let webSocketService: jasmine.SpyObj<WebSocketService>;
  let refreshTriggerSubject: Subject<unknown>;
  let destroy$: Subject<void>;
  let onTick: jasmine.Spy;
  let onComplete: jasmine.Spy;
  let statusRefresh: ParameterTrialStatusRefresh;

  beforeEach(() => {
    refreshTriggerSubject = new Subject<unknown>();
    webSocketService = jasmine.createSpyObj<WebSocketService>('WebSocketService', [
      'refreshTrigger',
    ]);
    webSocketService.refreshTrigger.and.returnValue(refreshTriggerSubject);

    destroy$ = new Subject<void>();
    onTick = jasmine.createSpy('onTick');
    onComplete = jasmine.createSpy('onComplete');

    statusRefresh = new ParameterTrialStatusRefresh(
      webSocketService,
      destroy$,
      onTick,
      onComplete
    );
  });

  afterEach(() => {
    // Make sure no dangling subscriptions leak between specs.
    statusRefresh.stop(false);
  });

  it('starts with an empty pending id list', () => {
    expect(statusRefresh.pendingParamMasterIds).toEqual([]);
  });

  it('does nothing when start() is called with an empty id list', () => {
    statusRefresh.start([], 10, () => false);

    expect(webSocketService.refreshTrigger).not.toHaveBeenCalled();
    expect(statusRefresh.pendingParamMasterIds).toEqual([]);
  });

  it('does nothing when start() is called while already destroyed', () => {
    statusRefresh.start([1, 2], 10, () => true);

    expect(webSocketService.refreshTrigger).not.toHaveBeenCalled();
    expect(statusRefresh.pendingParamMasterIds).toEqual([]);
  });

  it('subscribes to the parameter-trial refresh trigger and tracks pending ids on start', () => {
    statusRefresh.start([1, 2, 3], 100, () => false);

    expect(webSocketService.refreshTrigger).toHaveBeenCalledWith(
      WS_TOPICS.parameterTrial,
      jasmine.any(Number),
      true
    );
    expect(statusRefresh.pendingParamMasterIds).toEqual([1, 2, 3]);
  });

  it('invokes onTick with a snapshot of pending ids while the window is still open', fakeAsync(() => {
    statusRefresh.start([1, 2], 100, () => false);

    refreshTriggerSubject.next(null);

    expect(onTick).toHaveBeenCalledWith([1, 2]);
    expect(onComplete).not.toHaveBeenCalled();

    flush();
  }));

  it('treats a non-positive refresh window as a 1 second window', fakeAsync(() => {
    statusRefresh.start([4], 0, () => false);

    tick(999);
    expect(onComplete).not.toHaveBeenCalled();

    tick(1);
    expect(onComplete).toHaveBeenCalledWith([4]);
  }));

  it('auto-stops and triggers onComplete once the refresh window elapses', fakeAsync(() => {
    statusRefresh.start([10, 20], 2, () => false);

    tick(2000);

    expect(onComplete).toHaveBeenCalledWith([10, 20]);
    expect(statusRefresh.pendingParamMasterIds).toEqual([]);
  }));

  it('completes instead of ticking when the trigger fires after the window has elapsed', fakeAsync(() => {
    const nowSpy = spyOn(Date, 'now').and.returnValue(1_000);

    statusRefresh.start([7, 8], 5, () => false);

    nowSpy.and.returnValue(10_000);
    refreshTriggerSubject.next(null);

    expect(onComplete).toHaveBeenCalledWith([7, 8]);
    expect(onTick).not.toHaveBeenCalled();

    flush();
  }));

  it('restarts the cycle (stopping the previous one without completing it) when start() is called again', fakeAsync(() => {
    statusRefresh.start([1], 100, () => false);
    statusRefresh.start([2, 3], 100, () => false);

    expect(onComplete).not.toHaveBeenCalled();
    expect(statusRefresh.pendingParamMasterIds).toEqual([2, 3]);

    flush();
  }));

  it('stop(false) clears pending ids without invoking onComplete', fakeAsync(() => {
    statusRefresh.start([1, 2], 100, () => false);

    statusRefresh.stop(false);

    expect(onComplete).not.toHaveBeenCalled();
    expect(statusRefresh.pendingParamMasterIds).toEqual([]);

    // The underlying subscription must be torn down too.
    refreshTriggerSubject.next(null);
    expect(onTick).not.toHaveBeenCalled();
  }));

  it('stop(true) with no pending ids does not invoke onComplete', () => {
    statusRefresh.stop(true);

    expect(onComplete).not.toHaveBeenCalled();
    expect(statusRefresh.pendingParamMasterIds).toEqual([]);
  });

  it('stop(true) invokes onComplete with a snapshot of the pending ids and clears them', fakeAsync(() => {
    statusRefresh.start([5, 6], 100, () => false);

    statusRefresh.stop(true);

    expect(onComplete).toHaveBeenCalledWith([5, 6]);
    expect(statusRefresh.pendingParamMasterIds).toEqual([]);

    flush();
  }));

  it('stops reacting to further ticks once destroy$ emits', fakeAsync(() => {
    statusRefresh.start([9], 100, () => false);

    destroy$.next();
    refreshTriggerSubject.next(null);

    expect(onTick).not.toHaveBeenCalled();

    // The timeout scheduled by start() is untouched by destroy$, so it still
    // fires and completes the cycle with the ids that were pending.
    flush();
    expect(onComplete).toHaveBeenCalledWith([9]);
  }));

  it('calling stop() twice in a row is a no-op the second time', fakeAsync(() => {
    statusRefresh.start([1], 100, () => false);

    statusRefresh.stop(true);
    onComplete.calls.reset();
    statusRefresh.stop(true);

    expect(onComplete).not.toHaveBeenCalled();
  }));
});
