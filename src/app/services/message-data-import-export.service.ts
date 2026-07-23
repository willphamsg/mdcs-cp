import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { IDepoList } from '@app/models/depo';
import { IMessageDataFile } from '@app/models/parameter-management';
import { IMessageDataImportSearchRequest } from '@app/models/message-management';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import {
  BehaviorSubject,
  catchError,
  map,
  Observable,
  of,
  Subscription,
} from 'rxjs';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { IParams, PayloadResponse } from '@app/models/common';
import { AuthService } from './auth.service';
import { WebSocketService, WS_TOPICS } from './web-socket.service';
export interface MessageDataExportProcessState {
  isExportInProgress: boolean;
  dateSelected: string | null;
  grpIdentifierId: string | null;
  serviceProviderId: number | null;
  startedAt: number | null;
  payload: any | null;
  success: boolean;
  timedOut: boolean;
}

interface MessageDataExportRunningState {
  dateSelected: string;
  grpIdentifierId: string;
  serviceProviderId: number;
  startedAt: number;
}

const INITIAL_MESSAGE_DATA_EXPORT_PROCESS_STATE: MessageDataExportProcessState =
  {
    isExportInProgress: false,
    dateSelected: null,
    grpIdentifierId: null,
    serviceProviderId: null,
    startedAt: null,
    payload: null,
    success: false,
    timedOut: false,
  };

@Injectable({
  providedIn: 'root',
})
export class MessageDataImportExportService {
  private uri = `${environment.gateway}message-data/`;
  private handler = inject(HttpBackend);
  private readonly messageExportStorageKey =
    'dagw-message-data-export-running-state';
  private readonly messageExportPollIntervalMs = 5000;
  private readonly messageExportTimeoutMs = 240000;
  private messageExportPollingSubscription?: Subscription;
  private messageExportTimeoutHandle?: ReturnType<typeof setTimeout>;
  private messageExportStatusCheckInProgress = false;
  private messageExportProcessSubject =
    new BehaviorSubject<MessageDataExportProcessState>({
      ...INITIAL_MESSAGE_DATA_EXPORT_PROCESS_STATE,
    });

  messageExportProcess$ = this.messageExportProcessSubject.asObservable();

  constructor(
    private http: HttpClient,
    public dialog: MatDialog,
    private auth: AuthService,
    private message: MessageService,
    private dynamic: DynamicEndpoint,
    private webSocketService: WebSocketService
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('common', this.uri);
  }

  getMessageExportProcessSnapshot(): MessageDataExportProcessState {
    return this.messageExportProcessSubject.value;
  }

  startMessageExportPolling(
    dateSelected: string,
    grpIdentifierId: string,
    serviceProviderId: number
  ): void {
    const runningState: MessageDataExportRunningState = {
      dateSelected,
      grpIdentifierId,
      serviceProviderId,
      startedAt: Date.now(),
    };

    this.saveMessageExportRunningState(runningState);
    this.messageExportProcessSubject.next({
      isExportInProgress: true,
      dateSelected: runningState.dateSelected,
      grpIdentifierId: runningState.grpIdentifierId,
      serviceProviderId: runningState.serviceProviderId,
      startedAt: runningState.startedAt,
      payload: null,
      success: false,
      timedOut: false,
    });

    this.startMessageExportPollingTimer(runningState);
    this.checkMessageExportStatus(runningState);
  }

  resumeMessageExportPolling(): void {
    const runningState = this.getMessageExportRunningState();

    if (!runningState) {
      return;
    }

    if (this.isMessageExportTimedOut(runningState.startedAt)) {
      this.timeoutMessageExport(runningState);
      return;
    }

    this.messageExportProcessSubject.next({
      ...this.messageExportProcessSubject.value,
      isExportInProgress: true,
      dateSelected: runningState.dateSelected,
      grpIdentifierId: runningState.grpIdentifierId,
      serviceProviderId: runningState.serviceProviderId,
      startedAt: runningState.startedAt,
      success: false,
      timedOut: false,
    });

    if (!this.messageExportPollingSubscription) {
      this.startMessageExportPollingTimer(runningState);
      this.checkMessageExportStatus(runningState);
    }
  }

  clearMessageExportProcessState(): void {
    this.stopMessageExportPollingTimer();
    this.removeMessageExportRunningState();
    this.messageExportStatusCheckInProgress = false;
    this.messageExportProcessSubject.next({
      ...INITIAL_MESSAGE_DATA_EXPORT_PROCESS_STATE,
    });
  }

  clearCompletedMessageExportProcessState(): void {
    const currentState = this.messageExportProcessSubject.value;

    if (!currentState.isExportInProgress) {
      this.messageExportProcessSubject.next({
        ...INITIAL_MESSAGE_DATA_EXPORT_PROCESS_STATE,
      });
    }
  }

  private startMessageExportPollingTimer(
    runningState: MessageDataExportRunningState
  ): void {
    this.stopMessageExportPollingTimer();

    const remainingTimeoutMs = this.getRemainingMessageExportTimeoutMs(
      runningState.startedAt
    );

    if (remainingTimeoutMs <= 0) {
      this.timeoutMessageExport(runningState);
      return;
    }

    this.messageExportTimeoutHandle = setTimeout(() => {
      this.timeoutMessageExport(runningState);
    }, remainingTimeoutMs);

    this.messageExportPollingSubscription = this.webSocketService
      .refreshTrigger(
        WS_TOPICS.messageDataExport,
        this.messageExportPollIntervalMs
      )
      .subscribe(() => {
        this.checkMessageExportStatus(runningState);
      });
  }

  private stopMessageExportPollingTimer(): void {
    if (this.messageExportPollingSubscription) {
      this.messageExportPollingSubscription.unsubscribe();
      this.messageExportPollingSubscription = undefined;
    }

    if (this.messageExportTimeoutHandle) {
      clearTimeout(this.messageExportTimeoutHandle);
      this.messageExportTimeoutHandle = undefined;
    }
  }

  private checkMessageExportStatus(
    runningState: MessageDataExportRunningState
  ): void {
    if (this.messageExportStatusCheckInProgress) {
      return;
    }

    if (this.isMessageExportTimedOut(runningState.startedAt)) {
      this.timeoutMessageExport(runningState);
      return;
    }

    this.messageExportStatusCheckInProgress = true;

    this.searchExportFileByGroupId(
      runningState.grpIdentifierId,
      runningState.serviceProviderId,
      null
    ).subscribe({
      next: (value: PayloadResponse) => {
        this.messageExportStatusCheckInProgress = false;

        if (value.status !== 200) {
          return;
        }

        const isSuccess = this.areAllMessageExportItemsSuccessful(
          value.payload
        );

        this.messageExportProcessSubject.next({
          isExportInProgress: !isSuccess,
          dateSelected: runningState.dateSelected,
          grpIdentifierId: runningState.grpIdentifierId,
          serviceProviderId: runningState.serviceProviderId,
          startedAt: runningState.startedAt,
          payload: value.payload,
          success: isSuccess,
          timedOut: false,
        });

        if (isSuccess) {
          this.stopMessageExportPollingTimer();
          this.removeMessageExportRunningState();
        }
      },
      error: () => {
        this.messageExportStatusCheckInProgress = false;
      },
    });
  }

  private timeoutMessageExport(
    runningState: MessageDataExportRunningState
  ): void {
    this.stopMessageExportPollingTimer();
    this.removeMessageExportRunningState();
    this.messageExportStatusCheckInProgress = false;

    this.messageExportProcessSubject.next({
      ...this.messageExportProcessSubject.value,
      isExportInProgress: false,
      dateSelected: runningState.dateSelected,
      grpIdentifierId: null,
      serviceProviderId: null,
      startedAt: runningState.startedAt,
      success: false,
      timedOut: true,
    });
  }

  private getRemainingMessageExportTimeoutMs(startedAt: number): number {
    return this.messageExportTimeoutMs - (Date.now() - startedAt);
  }

  private isMessageExportTimedOut(startedAt: number): boolean {
    return this.getRemainingMessageExportTimeoutMs(startedAt) <= 0;
  }

  private areAllMessageExportItemsSuccessful(payload: any): boolean {
    const exportItems = payload?.['message_data_file_export'] ?? [];

    if (!exportItems || exportItems.length === 0) {
      return false;
    }

    return exportItems.every((item: any) => {
      return this.normalizeMessageExportStatus(item?.status) === 'SUCCESS';
    });
  }

  private normalizeMessageExportStatus(
    status: string | undefined | null
  ): string {
    return (status ?? '').trim().toUpperCase();
  }

  private saveMessageExportRunningState(
    state: MessageDataExportRunningState
  ): void {
    if (!this.isSessionStorageAvailable()) {
      return;
    }

    sessionStorage.setItem(this.messageExportStorageKey, JSON.stringify(state));
  }

  private getMessageExportRunningState(): MessageDataExportRunningState | null {
    if (!this.isSessionStorageAvailable()) {
      return null;
    }

    const storedState = sessionStorage.getItem(this.messageExportStorageKey);

    if (!storedState) {
      return null;
    }

    try {
      const parsedState = JSON.parse(
        storedState
      ) as Partial<MessageDataExportRunningState>;

      if (
        !parsedState.dateSelected ||
        !parsedState.grpIdentifierId ||
        parsedState.serviceProviderId === undefined ||
        parsedState.serviceProviderId === null ||
        !parsedState.startedAt
      ) {
        this.removeMessageExportRunningState();
        return null;
      }

      return {
        dateSelected: parsedState.dateSelected,
        grpIdentifierId: parsedState.grpIdentifierId,
        serviceProviderId: Number(parsedState.serviceProviderId),
        startedAt: Number(parsedState.startedAt),
      };
    } catch (error) {
      console.error('Invalid stored message export state:', error);
      this.removeMessageExportRunningState();
      return null;
    }
  }

  private removeMessageExportRunningState(): void {
    if (!this.isSessionStorageAvailable()) {
      return;
    }

    sessionStorage.removeItem(this.messageExportStorageKey);
  }

  private isSessionStorageAvailable(): boolean {
    return typeof sessionStorage !== 'undefined';
  }

  manage(params: IParams, type: string) {
    if (type === 'import') {
      return this.searchImport(params);
    } else {
      return this.searchExport(params);
    }
  }

  /**
   * Legacy search method - to be deprecated
   * Use searchImportByGroupId for new workflow
   */
  searchImport(params: IParams): Observable<PayloadResponse> {
    this.http = new HttpClient(this.handler);
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);
    headers = headers.set('Content-Type', 'application/json');

    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Dummy data fetched successfully',
        payload: {
          ...DummyData,
          parameter_file_data: DummyData?.parameter_file_data,
        },
      };
      return of(dummyData);
    }
    return this.http
      .post<PayloadResponse>(`${this.uri}import/search`, params, {
        headers: headers,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  /**
   * Search imported message data by group identifier
   * This is the new workflow after file upload returns grp_identifier
   *
   * @param grpIdentifier - The group identifier returned from file upload
   * @returns Observable containing the search results
   */
  searchImportByGroupId(grpIdentifier: string): Observable<PayloadResponse> {
    this.http = new HttpClient(this.handler);
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);
    headers = headers.set('Content-Type', 'application/json');

    const searchRequest: IMessageDataImportSearchRequest = {
      grp_identifier: grpIdentifier,
    };

    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'INFO 2020',
        timestamp: Date.now(),
        message: 'Dummy data fetched successfully',
        payload: {
          records_count: DummyData.message_data_import?.length || 0,
          message_data_import: DummyData.message_data_import || [],
        },
      };
      return of(dummyData);
    }

    return this.http
      .post<PayloadResponse>(`${this.uri}import/search`, searchRequest, {
        headers: headers,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  searchExport(params: IParams): Observable<PayloadResponse> {
    this.http = new HttpClient(this.handler);
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);
    headers = headers.set('Content-Type', 'application/json');

    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Dummy data fetched successfully',
        payload: {
          ...DummyData,
          param_file_export_entity_pgn: DummyData?.parameter_file_data,
        },
      };
      return of(dummyData);
    }
    return this.http
      .post<PayloadResponse>(`${this.uri}export/search`, params, {
        headers: headers,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  getImportedList(): Observable<IMessageDataFile[]> {
    if (environment.useDummyData) {
      const dummyData = DummyData.message_data_import;
      return of(dummyData);
    }
    return this.http.get<IMessageDataFile[]>('');
  }

  // Move all depot related in DepotService once API integrated
  getDepotService(): Observable<IDepoList[]> {
    if (environment?.useDummyData) {
      const dummyData = DummyData.dagw_depot_list;

      return of(dummyData).pipe(
        map(data => {
          return data.map(depot => ({
            ...depot,
            value: depot.depot_name,
          }));
        })
      );
    }

    return this.http.get<IDepoList[]>('');
  }

  /**
   * Upload message data file(s) and get group identifier
   *
   * Expected response format:
   * {
   *   "status": 200,
   *   "status_code": "INFO 2020",
   *   "timestamp": 1748928360523,
   *   "payload": {
   *     "grp_identifier": "41a1efe8a1f3b41a"
   *   }
   * }
   *
   * @param params - FormData containing the file to upload
   * @returns Observable with response containing grp_identifier
   */
  import(params: FormData): Observable<PayloadResponse> {
    this.http = new HttpClient(this.handler);
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);

    return this.http
      .post<PayloadResponse>(`${this.uri}import/upload/zip`, params, {
        headers: headers,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  export(params: any[]): Observable<PayloadResponse>;
  export(params: any[], returnBlob: boolean): Observable<Blob>;
  export(
    params: any[],
    returnBlob?: boolean
  ): Observable<PayloadResponse | Blob> {
    this.http = new HttpClient(this.handler);
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);

    if (environment?.useDummyData) {
      if (returnBlob) {
        // Return a dummy blob for testing
        const dummyBlob = new Blob(['dummy zip content'], {
          type: 'application/zip',
        });
        return of(dummyBlob);
      } else {
        const dummyData: PayloadResponse = {
          status: 200,
          status_code: 'SUCCESS',
          timestamp: Date.now(),
          message: 'Updated successfully',
          payload: DummyData,
        };
        return of(dummyData);
      }
    }

    if (returnBlob) {
      // Handle blob response for file download
      return this.http
        .post(`${this.uri}export/download/zip`, params, {
          headers: headers,
          responseType: 'blob',
        })
        .pipe(
          catchError((err: HttpErrorResponse) => {
            console.error('Blob download error:', err);
            return this.message.multiError(err);
          })
        );
    } else {
      // Handle JSON response
      headers = headers.set('Content-Type', 'application/json');
      return this.http
        .post<PayloadResponse>(`${this.uri}export/download/zip`, params, {
          headers: headers,
        })
        .pipe(
          catchError((err: HttpErrorResponse) => this.message.multiError(err))
        );
    }
  }

  /**
   * Send message export request for selected date
   *
   * @param dateSelected - Selected date in ISO format
   * @returns Observable with response
   */
  sendMessageExportRequest(
    dateSelected: string,
    spid: string
  ): Observable<PayloadResponse> {
    const requestBody = {
      date_selected: dateSelected,
      svc_prov_id: spid,
    };

    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);
    headers = headers.set('Content-Type', 'application/json');

    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Message export request sent successfully',
    //     payload: {},
    //   };
    //   return of(dummyData);
    // }

    return this.http
      .post<PayloadResponse>(
        `${this.uri}export/send-message-request`,
        requestBody,
        { headers: headers }
      )
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  searchExportFileByGroupId(
    grpIdentifierId: string,
    serviceProviderId: number,
    depotId: number | null = null
  ): Observable<PayloadResponse> {
    this.http = new HttpClient(this.handler);
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);
    headers = headers.set('Content-Type', 'application/json');

    const requestBody = {
      message_data_export: {
        grp_identifier_id: grpIdentifierId,
        service_provider_id: serviceProviderId,
        depot_id: depotId,
      },
    };

    if (environment?.useDummyData) {
      const dummyExportData = (DummyData as any).message_data_file_export || [];
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Dummy data fetched successfully',
        payload: {
          records_count: dummyExportData.length,
          message_data_file_export: dummyExportData,
        },
      };
      return of(dummyData);
    }

    return this.http
      .post<PayloadResponse>(`${this.uri}export-file/search`, requestBody, {
        headers: headers,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }
}
