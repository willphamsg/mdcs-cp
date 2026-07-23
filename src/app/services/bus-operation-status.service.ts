import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { catchError, Observable, of } from 'rxjs';
import { IBusTransferList } from '../models/bus-transfer';
import { IParams, PayloadResponse } from '../models/common';
import { DynamicEndpoint } from './dynamic-endpoint';
import { MessageService } from './message.service';

@Injectable({
  providedIn: 'root',
})
export class ManageBusOperationService {
  private uri = environment.gateway + 'operational-bus-list/';
  private handler = inject(HttpBackend);
  constructor(
    private http: HttpClient,
    public dialog: MatDialog,
    private message: MessageService,
    private dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('bus', this.uri);
  }

  search(params: IParams): Observable<PayloadResponse> {
    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Dummy data fetched successfully',
        payload: DummyData,
      };
      // return of(dummyData);
      // console.log({ requestBusTransferParams: params });
      return this.http
        .post<PayloadResponse>(`${this.uri}search`, params)
        .pipe(
          catchError((err: HttpErrorResponse) => this.message.multiError(err))
        );
    }
    // return this.http.post<PayloadResponse>(`${this.uri}search`, params);
    return this.http
      .post<PayloadResponse>(`${this.uri}search`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  import(params: any) {
    return this.http
      .post<PayloadResponse>(`${this.uri}import`, params)
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
    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Updated successfully',
        payload: DummyData,
      };
      // return of(dummyData);
      return this.http
        .post<PayloadResponse>(`${this.uri}update`, params)
        .pipe(catchError((err: HttpErrorResponse) => of(dummyData)));
    }
    return this.http
      .post<PayloadResponse>(`${this.uri}update`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  approve(params: IBusTransferList[]): Observable<PayloadResponse> {
    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Updated successfully',
        payload: DummyData,
      };
      // return of(dummyData);
      return this.http
        .post<PayloadResponse>(`${this.uri}approved`, params)
        .pipe(catchError((err: HttpErrorResponse) => of(dummyData)));
    }
    return this.http
      .post<PayloadResponse>(`${this.uri}approved`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  reject(params: IBusTransferList[]): Observable<PayloadResponse> {
    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Updated successfully',
        payload: DummyData,
      };
      // return of(dummyData);
      return this.http
        .post<PayloadResponse>(`${this.uri}reject`, params)
        .pipe(catchError((err: HttpErrorResponse) => of(dummyData)));
    }
    return this.http
      .post<PayloadResponse>(`${this.uri}reject`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }
}
