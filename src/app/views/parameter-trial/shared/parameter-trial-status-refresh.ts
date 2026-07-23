import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WebSocketService, WS_TOPICS } from '@app/services/web-socket.service';

const DEFAULT_INTERVAL_MS = 5000;

/**
 * Shared parameter-trial status polling cycle used by end-trial,
 * parameter-mode, and new-parameter-approval search pages.
 */
export class ParameterTrialStatusRefresh {
  private timer$?: Subscription;
  private timeoutHandle?: ReturnType<typeof setTimeout>;
  private endTime = 0;
  private pendingIds: number[] = [];

  constructor(
    private readonly webSocketService: WebSocketService,
    private readonly destroy$: Subject<void>,
    private readonly onTick: (pendingIds: number[]) => void,
    private readonly onComplete: (pendingIds: number[]) => void,
    private readonly intervalMs = DEFAULT_INTERVAL_MS
  ) {}

  get pendingParamMasterIds(): number[] {
    return this.pendingIds;
  }

  start(paramMasterIds: number[], refreshWindowSeconds: number, isDestroyed: () => boolean): void {
    if (!paramMasterIds.length || isDestroyed()) {
      return;
    }

    this.stop(false);
    this.pendingIds = paramMasterIds;

    const windowSeconds = refreshWindowSeconds > 0 ? refreshWindowSeconds : 1;
    this.endTime = Date.now() + windowSeconds * 1000;

    this.timeoutHandle = setTimeout(() => {
      this.stop(true);
    }, windowSeconds * 1000);

    this.timer$ = this.webSocketService
      .refreshTrigger(WS_TOPICS.parameterTrial, this.intervalMs, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (Date.now() >= this.endTime) {
          this.stop(true);
          return;
        }
        this.onTick([...this.pendingIds]);
      });
  }

  stop(triggerComplete = false): void {
    if (this.timer$) {
      this.timer$.unsubscribe();
      this.timer$ = undefined;
    }
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = undefined;
    }

    if (triggerComplete && this.pendingIds.length > 0) {
      const ids = [...this.pendingIds];
      this.pendingIds = [];
      this.onComplete(ids);
    } else if (!triggerComplete) {
      this.pendingIds = [];
    }
  }
}
