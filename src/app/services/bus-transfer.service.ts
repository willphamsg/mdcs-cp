import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '@env/environment';
import { catchError, Observable } from 'rxjs';
import { IBusTransferList } from '../models/bus-transfer';
import { IParams, PayloadResponse } from '../models/common';
import { DynamicEndpoint } from './dynamic-endpoint';
import { MessageService } from './message.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class ManageBusTransferService {
  private readonly uri: string;
  private readonly handler = inject(HttpBackend);
  constructor(
    private readonly http: HttpClient,
    public readonly dialog: MatDialog,
    private readonly message: MessageService,
    private readonly dynamic: DynamicEndpoint,
    private readonly auth: AuthService
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('bus', environment.gateway + 'bus-transfer/');
  }

  search(params: IParams): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Dummy data fetched successfully',
    //     payload: DummyData,
    //   };
    //   return of(dummyData);
    // }
    // return this.http.post<PayloadResponse>(`${this.uri}search`, params);
    return this.http
      .post<PayloadResponse>(`${this.uri}search`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  import(params: FormData) {
    const http = new HttpClient(this.handler);
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);
    return http
      .post<PayloadResponse>(`${this.uri}import`, params, { headers: headers })
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  manage(
    params: IBusTransferList[],
    action: string
  ): Observable<PayloadResponse> {
    switch (action) {
      case 'approve':
        return this.approve(params);
      case 'reject':
        return this.reject(params);
      default:
        return this.update(params);
    }
  }

  update(params: IBusTransferList[]): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Updated successfully',
    //     payload: DummyData,
    //   };
    //   return of(dummyData);
    // }
    return this.http
      .post<PayloadResponse>(`${this.uri}update`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  approve(params: IBusTransferList[]): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Updated successfully',
    //     payload: DummyData,
    //   };
    //   return of(dummyData);
    // }
    return this.http
      .post<PayloadResponse>(`${this.uri}approved`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  reject(params: IBusTransferList[]): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Updated successfully',
    //     payload: DummyData,
    //   };
    //   return of(dummyData);
    // }
    return this.http
      .post<PayloadResponse>(`${this.uri}reject`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }
}
