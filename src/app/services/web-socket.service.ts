import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, NgZone, PLATFORM_ID } from '@angular/core';
import { environment } from '@env/environment';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { interval, merge, Observable, of, Subject } from 'rxjs';
import { AuthService } from './auth.service';

export const WS_TOPICS = {
  masterBusList: '/ws/topic/master-bus-list',
  busOperationStatus: '/ws/topic/bus-operation-status',
  busTransfer: '/ws/topic/bus-transfer',
  parameterTrial: '/ws/topic/parameter-trial',
  eodProcess: '/ws/topic/eod-process',
  parameterFileExport: '/ws/topic/parameter-file-export',
  parameterFileImport: '/ws/topic/parameter-file-import',
  messageDataExport: '/ws/topic/message-data-export',
  messageDataImport: '/ws/topic/message-data-import',
} as const;

export type WebSocketTopic =
  | (typeof WS_TOPICS)[keyof typeof WS_TOPICS]
  | string;

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private client?: Client;
  private subjects = new Map<string, Subject<unknown>>();
  private subscriptions = new Map<string, StompSubscription>();
  private requestedTopics = new Set<string>();
  private connecting = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService,
    private zone: NgZone
  ) {}

  isEnabled(): boolean {
    const wsEnabled = this.authService.isWebSocketEnabled();
    const wsUrl = this.authService.wsUrl();

    console.log('[WebSocket] enabled check:', {
      wsEnabled,
      wsUrl,
    });

    return Boolean(wsEnabled && wsUrl);
  }

  refreshTrigger(
    topic: WebSocketTopic,
    fallbackIntervalMs: number,
    emitInitial = false
  ): Observable<unknown> {
    const enabled = this.isEnabled();

    console.log('[WebSocket] refreshTrigger:', {
      topic: topic,
      enabled,
      fallbackIntervalMs,
    });

    const source$ = enabled
      ? this.watch(topic)
      : interval(fallbackIntervalMs);

    return emitInitial ? merge(of(null), source$) : source$;
  }

  watch(topic: WebSocketTopic): Observable<unknown> {
    console.log('[WebSocket] watch topic:', topic);

    this.requestedTopics.add(topic);

    const subject = this.getSubject(topic);

    this.connect();

    if (this.client?.connected) {
      this.subscribeTopic(topic);
    }

    return subject.asObservable();
  }

  connect(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('[WebSocket] skipped: not browser platform');
      return;
    }

    if (!this.isEnabled()) {
      console.warn('[WebSocket] skipped: disabled or wsUrl empty');
      return;
    }

    if (this.connecting || this.client?.active || this.client?.connected) {
      console.log('[WebSocket] skipped: already connecting/active/connected', {
        connecting: this.connecting,
        active: this.client?.active,
        connected: this.client?.connected,
      });
      return;
    }

    this.connecting = true;

    const sockJsEndpoint = this.getSockJsEndpoint();

    console.log('[WebSocket] SockJS endpoint:', sockJsEndpoint);

    this.client = new Client({
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      /**
       * Backend sample uses:
       * stompClient.connect({}, ...)
       *
       * So keep empty unless environment.webSocketUseAuthHeader = true.
       */
      connectHeaders: this.authHeaders(),

      webSocketFactory: () => {
        console.log('[WebSocket] creating SockJS instance');
        return new SockJS(sockJsEndpoint) as unknown as WebSocket;
      },

      debug: message => {
        console.log('[WebSocket STOMP]', message);
      },

      onConnect: () => {
        this.zone.run(() => {
          console.log('[WebSocket] Connected successfully');

          this.connecting = false;
          this.subscriptions.clear();

          this.requestedTopics.forEach(topic => {
            this.subscribeTopic(topic);
          });
        });
      },

      onDisconnect: () => {
        this.zone.run(() => {
          console.warn('[WebSocket] disconnected');
          this.subscriptions.clear();
        });
      },

      onStompError: frame => {
        console.error('[WebSocket] STOMP error:', frame.headers, frame.body);
      },

      onWebSocketError: event => {
        console.error('[WebSocket] transport error:', event);
      },

      onWebSocketClose: event => {
        this.zone.run(() => {
          console.warn('[WebSocket] closed:', event);
          this.connecting = false;
          this.subscriptions.clear();
        });
      },
    });

    this.zone.runOutsideAngular(() => {
      this.client?.activate();
    });
  }

  disconnect(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.subscriptions.clear();

    if (this.client?.active || this.client?.connected) {
      this.client.deactivate();
    }

    this.connecting = false;
  }

  private subscribeTopic(topic: string): void {
    if (!this.client?.connected) {
      console.warn('[WebSocket] cannot subscribe, not connected:', topic);
      return;
    }

    if (this.subscriptions.has(topic)) {
      console.log('[WebSocket] already subscribed:', topic);
      return;
    }

    const subscription = this.client.subscribe(topic, (message: IMessage) => {
      this.zone.run(() => {
        console.log('[WebSocket] message received:', {
          topic,
          body: message.body,
        });

        this.getSubject(topic).next(this.parseMessage(message.body));
      });
    });

    console.log('[WebSocket] subscribed:', topic);
    this.subscriptions.set(topic, subscription);
  }

  private getSockJsEndpoint(): string {
    const wsUrl = this.authService.wsUrl();
    const defaultWsUrl = String(environment.wsUrl || '').trim();

    let configuredUrl: string = wsUrl ?? defaultWsUrl;

    if (!configuredUrl) {
      return '';
    }

    if (environment.dagw && !wsUrl) {
      configuredUrl = configuredUrl.replace("mdcs", "dagw");
    }

    const cleanUrl = configuredUrl
      .replace(/\/info$/, '')
      .replace(/\/+$/, '');

    if (cleanUrl.endsWith('/ws/connect')) {
      return cleanUrl;
    }

    return `${cleanUrl}/ws/connect`;
  }

  private getSubject(topic: string): Subject<unknown> {
    let subject = this.subjects.get(topic);

    if (!subject) {
      subject = new Subject<unknown>();
      this.subjects.set(topic, subject);
    }

    return subject;
  }

  private parseMessage(body: string): unknown {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  private authHeaders(): Record<string, string> {
    const token = this.authService.getToken();

    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  }
}