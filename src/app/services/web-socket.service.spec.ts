import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from '@env/environment';
import { Client } from '@stomp/stompjs';
import { take } from 'rxjs';
import { AuthService } from './auth.service';
import { WebSocketService, WS_TOPICS } from './web-socket.service';

/**
 * IMPORTANT: WebSocketService.connect() creates a real SockJS/STOMP `Client`
 * and calls `activate()` whenever `isEnabled()` is true and we're on a
 * browser platform. To avoid ever opening a real socket in this suite (which
 * has previously caused browser test hangs/crashes), every test either:
 *  - mocks AuthService.isWebSocketEnabled()/wsUrl() to keep isEnabled()
 *    false, or
 *  - spies on `connect()` itself (turning it into a no-op) before exercising
 *    code paths that call it indirectly (e.g. watch/refreshTrigger), or
 *  - fakes `(service as any).client` with a plain object instead of a real
 *    STOMP Client, to exercise subscribeTopic/disconnect logic.
 * The "actually create a Client and activate()" branch inside connect() is
 * intentionally left unexercised for safety.
 */
describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isWebSocketEnabled',
      'wsUrl',
      'getToken',
    ]);
    mockAuthService.isWebSocketEnabled.and.returnValue(false);
    mockAuthService.wsUrl.and.returnValue(null);
    mockAuthService.getToken.and.returnValue('');

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    service = TestBed.inject(WebSocketService);
  });

  afterEach(() => {
    // Make sure nothing lingers between tests even though we never create a
    // real client.
    service.disconnect();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isEnabled', () => {
    it('should return false when websocket is disabled and no url is set', () => {
      mockAuthService.isWebSocketEnabled.and.returnValue(false);
      mockAuthService.wsUrl.and.returnValue(null);
      expect(service.isEnabled()).toBeFalse();
    });

    it('should return false when enabled but no wsUrl is configured', () => {
      mockAuthService.isWebSocketEnabled.and.returnValue(true);
      mockAuthService.wsUrl.and.returnValue(null);
      expect(service.isEnabled()).toBeFalse();
    });

    it('should return false when a wsUrl is configured but disabled', () => {
      mockAuthService.isWebSocketEnabled.and.returnValue(false);
      mockAuthService.wsUrl.and.returnValue('wss://host/ws');
      expect(service.isEnabled()).toBeFalse();
    });

    it('should return true when enabled and a wsUrl is configured', () => {
      mockAuthService.isWebSocketEnabled.and.returnValue(true);
      mockAuthService.wsUrl.and.returnValue('wss://host/ws');
      expect(service.isEnabled()).toBeTrue();
    });

    it('should return false when wsUrl is an empty string', () => {
      mockAuthService.isWebSocketEnabled.and.returnValue(true);
      mockAuthService.wsUrl.and.returnValue('');
      expect(service.isEnabled()).toBeFalse();
    });
  });

  describe('refreshTrigger', () => {
    it('should fall back to a plain interval when disabled', done => {
      mockAuthService.isWebSocketEnabled.and.returnValue(false);
      mockAuthService.wsUrl.and.returnValue(null);

      const watchSpy = spyOn(service, 'watch').and.callThrough();

      service
        .refreshTrigger(WS_TOPICS.parameterTrial, 5)
        .pipe(take(1))
        .subscribe(() => {
          expect(watchSpy).not.toHaveBeenCalled();
          done();
        });
    });

    it('should watch the topic when enabled (connect is stubbed to avoid a real socket)', () => {
      mockAuthService.isWebSocketEnabled.and.returnValue(true);
      mockAuthService.wsUrl.and.returnValue('wss://host/ws');
      spyOn(service, 'connect');

      const watchSpy = spyOn(service, 'watch').and.callThrough();

      const obs$ = service.refreshTrigger(WS_TOPICS.parameterTrial, 5000);

      expect(watchSpy).toHaveBeenCalledWith(WS_TOPICS.parameterTrial);
      expect(obs$).toBeTruthy();
    });

    it('should not emit an initial value by default', () => {
      mockAuthService.isWebSocketEnabled.and.returnValue(false);
      mockAuthService.wsUrl.and.returnValue(null);

      let emissions = 0;
      const sub = service
        .refreshTrigger(WS_TOPICS.parameterTrial, 100000)
        .subscribe(() => emissions++);

      expect(emissions).toBe(0);
      sub.unsubscribe();
    });

    it('should emit an initial null value immediately when emitInitial is true', () => {
      mockAuthService.isWebSocketEnabled.and.returnValue(false);
      mockAuthService.wsUrl.and.returnValue(null);

      let firstValue: unknown = 'not-set';
      const sub = service
        .refreshTrigger(WS_TOPICS.parameterTrial, 100000, true)
        .subscribe(value => {
          if (firstValue === 'not-set') {
            firstValue = value;
          }
        });

      expect(firstValue).toBeNull();
      sub.unsubscribe();
    });
  });

  describe('watch', () => {
    it('should register the topic and call connect (stubbed)', () => {
      const connectSpy = spyOn(service, 'connect');

      service.watch(WS_TOPICS.busTransfer);

      expect((service as any).requestedTopics.has(WS_TOPICS.busTransfer)).toBeTrue();
      expect(connectSpy).toHaveBeenCalled();
    });

    it('should not subscribe immediately when there is no connected client', () => {
      spyOn(service, 'connect');

      service.watch(WS_TOPICS.busTransfer);

      expect((service as any).subscriptions.has(WS_TOPICS.busTransfer)).toBeFalse();
    });

    it('should subscribe immediately when a fake connected client is already present', () => {
      spyOn(service, 'connect');
      const fakeSubscription = { id: 'sub-1', unsubscribe: jasmine.createSpy('unsubscribe') };
      const fakeClient = {
        connected: true,
        subscribe: jasmine.createSpy('subscribe').and.returnValue(fakeSubscription),
        deactivate: jasmine.createSpy('deactivate'),
      };
      (service as any).client = fakeClient;

      service.watch(WS_TOPICS.busTransfer);

      expect(fakeClient.subscribe).toHaveBeenCalled();
      expect((service as any).subscriptions.has(WS_TOPICS.busTransfer)).toBeTrue();
    });

    it('should return an observable backed by the same subject on repeated calls for the same topic', () => {
      spyOn(service, 'connect');

      const values: unknown[] = [];
      service.watch(WS_TOPICS.busTransfer).subscribe(v => values.push(v));
      service.watch(WS_TOPICS.busTransfer).subscribe(v => values.push(v));

      (service as any).getSubject(WS_TOPICS.busTransfer).next('hello');

      expect(values).toEqual(['hello', 'hello']);
    });
  });

  describe('connect (guard branches only – never reaches real Client creation)', () => {
    it('should skip when disabled', () => {
      mockAuthService.isWebSocketEnabled.and.returnValue(false);
      mockAuthService.wsUrl.and.returnValue(null);

      spyOn(console, 'warn');
      service.connect();

      expect((service as any).client).toBeUndefined();
      expect(console.warn).toHaveBeenCalled();
    });

    it('should skip when already connecting', () => {
      mockAuthService.isWebSocketEnabled.and.returnValue(true);
      mockAuthService.wsUrl.and.returnValue('wss://host/ws');
      (service as any).connecting = true;

      service.connect();

      // client should never have been touched by this call
      expect((service as any).client).toBeUndefined();
    });

    it('should skip when the (fake) client is already active', () => {
      mockAuthService.isWebSocketEnabled.and.returnValue(true);
      mockAuthService.wsUrl.and.returnValue('wss://host/ws');
      (service as any).client = { active: true, connected: false, deactivate: jasmine.createSpy('deactivate') };

      const clientBefore = (service as any).client;
      service.connect();

      expect((service as any).client).toBe(clientBefore);
    });

    it('should skip when the (fake) client is already connected', () => {
      mockAuthService.isWebSocketEnabled.and.returnValue(true);
      mockAuthService.wsUrl.and.returnValue('wss://host/ws');
      (service as any).client = { active: false, connected: true, deactivate: jasmine.createSpy('deactivate') };

      const clientBefore = (service as any).client;
      service.connect();

      expect((service as any).client).toBe(clientBefore);
    });
  });

  describe('connect (success path with a real Client, but activate() is stubbed out)', () => {
    /**
     * This block lets connect() run all the way through, including the
     * construction of a real @stomp/stompjs `Client`. That construction
     * itself never opens a socket - only `client.activate()` does, and we
     * stub that out via `spyOn(Client.prototype, 'activate')` so it becomes
     * a no-op. This lets us safely grab the real callback functions
     * (onConnect/onDisconnect/onStompError/onWebSocketError/
     * onWebSocketClose/debug) that connect() wires into the Client config
     * and invoke them directly to exercise their bodies, without ever
     * triggering a real SockJS connection attempt. We deliberately do NOT
     * invoke `client.webSocketFactory()`, since that would construct a real
     * SockJS instance and could attempt a real network connection.
     */
    it('should construct a real Client and wire up STOMP callbacks without ever activating a socket', () => {
      mockAuthService.isWebSocketEnabled.and.returnValue(true);
      mockAuthService.wsUrl.and.returnValue('wss://host/ws');
      spyOn(Client.prototype, 'activate');
      spyOn(console, 'log');
      spyOn(console, 'warn');
      spyOn(console, 'error');

      service.connect();

      expect(Client.prototype.activate).toHaveBeenCalled();

      const client: any = (service as any).client;
      expect(client).toBeTruthy();
      expect((service as any).connecting).toBeTrue();

      expect(() => client.debug('debug message')).not.toThrow();

      expect(() =>
        client.onStompError({ headers: {}, body: 'boom' })
      ).not.toThrow();

      expect(() =>
        client.onWebSocketError({ message: 'ws transport error' })
      ).not.toThrow();

      (service as any).requestedTopics.add(WS_TOPICS.busTransfer);
      expect(() => client.onConnect()).not.toThrow();
      expect((service as any).connecting).toBeFalse();

      expect(() => client.onDisconnect()).not.toThrow();

      (service as any).connecting = true;
      expect(() => client.onWebSocketClose({ code: 1000 })).not.toThrow();
      expect((service as any).connecting).toBeFalse();
    });
  });

  describe('disconnect', () => {
    it('should be a no-op (no throw) when never connected', () => {
      expect(() => service.disconnect()).not.toThrow();
    });

    it('should unsubscribe and clear all tracked subscriptions', () => {
      const sub1 = { unsubscribe: jasmine.createSpy('unsubscribe1') };
      const sub2 = { unsubscribe: jasmine.createSpy('unsubscribe2') };
      (service as any).subscriptions.set('topic-a', sub1);
      (service as any).subscriptions.set('topic-b', sub2);

      service.disconnect();

      expect(sub1.unsubscribe).toHaveBeenCalled();
      expect(sub2.unsubscribe).toHaveBeenCalled();
      expect((service as any).subscriptions.size).toBe(0);
    });

    it('should deactivate an active fake client', () => {
      const fakeClient = {
        active: true,
        connected: false,
        deactivate: jasmine.createSpy('deactivate'),
      };
      (service as any).client = fakeClient;

      service.disconnect();

      expect(fakeClient.deactivate).toHaveBeenCalled();
    });

    it('should deactivate a connected fake client', () => {
      const fakeClient = {
        active: false,
        connected: true,
        deactivate: jasmine.createSpy('deactivate'),
      };
      (service as any).client = fakeClient;

      service.disconnect();

      expect(fakeClient.deactivate).toHaveBeenCalled();
    });

    it('should not deactivate a fake client that is neither active nor connected', () => {
      const fakeClient = {
        active: false,
        connected: false,
        deactivate: jasmine.createSpy('deactivate'),
      };
      (service as any).client = fakeClient;

      service.disconnect();

      expect(fakeClient.deactivate).not.toHaveBeenCalled();
    });

    it('should reset the connecting flag', () => {
      (service as any).connecting = true;
      service.disconnect();
      expect((service as any).connecting).toBeFalse();
    });
  });

  describe('subscribeTopic (private, exercised via cast)', () => {
    it('should warn and do nothing when there is no connected client', () => {
      spyOn(console, 'warn');
      (service as any).subscribeTopic('topic-a');

      expect((service as any).subscriptions.has('topic-a')).toBeFalse();
      expect(console.warn).toHaveBeenCalled();
    });

    it('should subscribe once via the fake client and store the subscription', () => {
      const fakeSubscription = { id: 'sub-1', unsubscribe: jasmine.createSpy('unsubscribe') };
      const fakeClient = {
        connected: true,
        subscribe: jasmine.createSpy('subscribe').and.returnValue(fakeSubscription),
        deactivate: jasmine.createSpy('deactivate'),
      };
      (service as any).client = fakeClient;

      (service as any).subscribeTopic('topic-a');

      expect(fakeClient.subscribe).toHaveBeenCalledTimes(1);
      expect((service as any).subscriptions.get('topic-a')).toBe(fakeSubscription);
    });

    it('should not subscribe again when already subscribed to the topic', () => {
      const fakeClient = {
        connected: true,
        subscribe: jasmine.createSpy('subscribe').and.returnValue({ id: 'sub-1', unsubscribe: jasmine.createSpy('unsubscribe') }),
        deactivate: jasmine.createSpy('deactivate'),
      };
      (service as any).client = fakeClient;

      (service as any).subscribeTopic('topic-a');
      (service as any).subscribeTopic('topic-a');

      expect(fakeClient.subscribe).toHaveBeenCalledTimes(1);
    });

    it('should push parsed message bodies onto the topic subject when a message arrives', () => {
      let capturedCallback: ((msg: { body: string }) => void) | undefined;
      const fakeClient = {
        connected: true,
        subscribe: jasmine
          .createSpy('subscribe')
          .and.callFake((_topic: string, cb: (msg: { body: string }) => void) => {
            capturedCallback = cb;
            return { id: 'sub-1', unsubscribe: jasmine.createSpy('unsubscribe') };
          }),
        deactivate: jasmine.createSpy('deactivate'),
      };
      (service as any).client = fakeClient;

      const received: unknown[] = [];
      (service as any).getSubject('topic-a').subscribe((v: unknown) => received.push(v));

      (service as any).subscribeTopic('topic-a');
      expect(capturedCallback).toBeDefined();

      capturedCallback!({ body: JSON.stringify({ hello: 'world' }) });

      expect(received).toEqual([{ hello: 'world' }]);
    });
  });

  describe('getSockJsEndpoint (private, exercised via cast)', () => {
    let previousDagw: boolean;
    let previousWsUrl: string;

    beforeEach(() => {
      previousDagw = environment.dagw;
      previousWsUrl = environment.wsUrl;
    });

    afterEach(() => {
      (environment as any).dagw = previousDagw;
      (environment as any).wsUrl = previousWsUrl;
    });

    it('should return an empty string when there is no configured url anywhere', () => {
      mockAuthService.wsUrl.and.returnValue(null);
      (environment as any).wsUrl = '';

      expect((service as any).getSockJsEndpoint()).toBe('');
    });

    it('should strip a trailing "/info" and append "/ws/connect"', () => {
      mockAuthService.wsUrl.and.returnValue('https://host/report-ws/info');

      expect((service as any).getSockJsEndpoint()).toBe(
        'https://host/report-ws/ws/connect'
      );
    });

    it('should strip trailing slashes before appending "/ws/connect"', () => {
      mockAuthService.wsUrl.and.returnValue('https://host/report-ws///');

      expect((service as any).getSockJsEndpoint()).toBe(
        'https://host/report-ws/ws/connect'
      );
    });

    it('should not duplicate the "/ws/connect" suffix when already present', () => {
      mockAuthService.wsUrl.and.returnValue('https://host/report-ws/ws/connect');

      expect((service as any).getSockJsEndpoint()).toBe(
        'https://host/report-ws/ws/connect'
      );
    });

    it('should replace "mdcs" with "dagw" when environment.dagw is true and the profile has no wsUrl override', () => {
      mockAuthService.wsUrl.and.returnValue(null);
      (environment as any).dagw = true;
      (environment as any).wsUrl = 'https://web.mdcs:8060/report-ws';

      expect((service as any).getSockJsEndpoint()).toBe(
        'https://web.dagw:8060/report-ws/ws/connect'
      );
    });

    it('should NOT replace "mdcs" when a profile-specific wsUrl is present, even if environment.dagw is true', () => {
      mockAuthService.wsUrl.and.returnValue('https://web.mdcs:8060/report-ws');
      (environment as any).dagw = true;

      expect((service as any).getSockJsEndpoint()).toBe(
        'https://web.mdcs:8060/report-ws/ws/connect'
      );
    });
  });

  describe('parseMessage (private, exercised via cast)', () => {
    it('should parse valid JSON', () => {
      expect((service as any).parseMessage('{"a":1}')).toEqual({ a: 1 });
    });

    it('should return the raw string when JSON parsing fails', () => {
      expect((service as any).parseMessage('not-json')).toBe('not-json');
    });
  });

  describe('authHeaders (private, exercised via cast)', () => {
    it('should return an Authorization header when a token is present', () => {
      mockAuthService.getToken.and.returnValue('abc123');
      expect((service as any).authHeaders()).toEqual({
        Authorization: 'Bearer abc123',
      });
    });

    it('should return an empty object when there is no token', () => {
      mockAuthService.getToken.and.returnValue('');
      expect((service as any).authHeaders()).toEqual({});
    });

    it('should return an empty object when getToken returns null', () => {
      mockAuthService.getToken.and.returnValue(null as any);
      expect((service as any).authHeaders()).toEqual({});
    });
  });
});

describe('WebSocketService - non-browser platform (SSR)', () => {
  let service: WebSocketService;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', [
      'isWebSocketEnabled',
      'wsUrl',
      'getToken',
    ]);
    mockAuthService.isWebSocketEnabled.and.returnValue(true);
    mockAuthService.wsUrl.and.returnValue('wss://host/ws');

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });

    service = TestBed.inject(WebSocketService);
  });

  it('connect() should skip creating a client when not on the browser platform, even if enabled', () => {
    spyOn(console, 'warn');

    service.connect();

    expect((service as any).client).toBeUndefined();
    expect(console.warn).toHaveBeenCalled();
  });
});
