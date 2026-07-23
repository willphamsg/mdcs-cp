import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import {
  IActionHistoryParams,
  IParams,
  PayloadResponse,
} from '../models/common';
import {
  INewParameterApproval,
  IValidateLiveRequest,
  IParameterModeActionRequest,
} from '../models/parameter-trial';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '@env/environment';
import DummyData from '@data/db.json';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';

@Injectable({
  providedIn: 'root',
})
export class ParameterService {
  private readonly uri: string;
  private readonly uriHistorySearch: string;

  private readonly uriScheduler: string;

  constructor(
    private readonly http: HttpClient,
    public readonly dialog: MatDialog,
    private readonly message: MessageService,
    private readonly dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('param', environment.gateway + 'parameter/trial/');
    this.uriHistorySearch = this.dynamic.setDynamicEndpoint(
      'param',
      environment.gateway + 'parameter/trial-history/'
    );
    this.uriScheduler = this.dynamic.setDynamicEndpoint(
      'param',
      environment.gateway + 'parameter/scheduler/'
    );
  }

  search(params: IParams): Observable<PayloadResponse> {
    return this.http
      .post<PayloadResponse>(`${this.uri}search`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  historySearch(params: IParams): Observable<PayloadResponse> {
    return this.http
      .post<PayloadResponse>(`${this.uriHistorySearch}search`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  searchHistory(params: IActionHistoryParams): Observable<PayloadResponse> {
    return this.historySearch(params);
  }

  searchError(
    params: IActionHistoryParams,
    componentType?: string
  ): Observable<PayloadResponse> {
    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'INFO 4400',
        timestamp: 1755503344770,
        message: 'Search Trial History',
        payload: {
          new_parameter_approval_list: [], // Fixed the key to match what components expect
          parameter_mode_list: [],
          end_trial_list: [],
          records_count: 0,
        },
      };
      return of(dummyData);
    }

    // Add timestamp and component type to prevent caching and identify the caller
    const paramsWithTimestamp = {
      ...params,
      _timestamp: Date.now(),
      _component: componentType || 'unknown',
    };

    return this.http
      .post<PayloadResponse>(
        `${this.uriHistorySearch}search-error`,
        paramsWithTimestamp,
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
            Expires: '0',
          },
        }
      )
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  // Specific methods for each component type
  searchNewParameterApprovalErrors(
    params: IActionHistoryParams
  ): Observable<PayloadResponse> {
    return this.searchError(params, 'new-parameter-approval');
  }

  searchParameterModeErrors(
    params: IActionHistoryParams
  ): Observable<PayloadResponse> {
    return this.searchError(params, 'parameter-mode');
  }

  searchEndTrialErrors(
    params: IActionHistoryParams
  ): Observable<PayloadResponse> {
    return this.searchError(params, 'end-trial');
  }

  manage(
    params: INewParameterApproval[],
    action: string
  ): Observable<PayloadResponse> {
    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Updated successfully',
        payload: DummyData,
      };
      return of(dummyData);
    }
    return this.http.post<PayloadResponse>(`${this.uri}${action}`, params);
  }

  validateLive(params: IValidateLiveRequest[]): Observable<PayloadResponse> {
    return this.http.post<PayloadResponse>(`${this.uri}validate-live`, params);
  }

  live(params: IParameterModeActionRequest[]): Observable<PayloadResponse> {
    return this.http.post<PayloadResponse>(`${this.uri}live`, params);
  }

  validateTrial(params: IValidateLiveRequest[]): Observable<PayloadResponse> {
    return this.http.post<PayloadResponse>(`${this.uri}validate-trial`, params);
  }

  trial(params: IParameterModeActionRequest[]): Observable<PayloadResponse> {
    return this.http.post<PayloadResponse>(`${this.uri}trial`, params);
  }

  getTrialSchedulerRateSeconds(): Observable<PayloadResponse> {
    return this.http
      .get<PayloadResponse>(`${this.uriScheduler}trialRateSeconds`)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  getImportRateSeconds(): Observable<PayloadResponse> {
    return this.http
      .get<PayloadResponse>(`${this.uriScheduler}importRateSeconds`)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  getExportRateSeconds(): Observable<PayloadResponse> {
    return this.http
      .get<PayloadResponse>(`${this.uriScheduler}exportRateSeconds`)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }
}
