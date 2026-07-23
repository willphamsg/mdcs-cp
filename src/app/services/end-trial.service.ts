import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { BusRequest, PayloadResponse, IParams } from '../models/common';
import { IEndTrial } from '../models/parameter-trial';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '@env/environment';
import DummyData from '@data/db.json';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';

@Injectable({
  providedIn: 'root',
})
export class EndTrialService {
  private uri = environment.gateway + 'parameter-trial/';
  constructor(
    private http: HttpClient,
    public dialog: MatDialog,
    private message: MessageService,
    private dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('param', this.uri);
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
      console.log('End trial params', params);
      return this.http
        .get<PayloadResponse>(`${this.uri}search`)
        .pipe(catchError((err: HttpErrorResponse) => of(dummyData)));
    }
    return this.http.post<PayloadResponse>(`${this.uri}search`, params);
  }

  manage(params: IEndTrial[]): Observable<PayloadResponse> {
    return this.update(params);
  }

  add(params: IEndTrial[]): Observable<PayloadResponse> {
    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Added successfully',
        payload: DummyData,
      };
      // return of(dummyData);
      return this.http
        .post<PayloadResponse>(`${this.uri}add`, params)
        .pipe(catchError((err: HttpErrorResponse) => of(dummyData)));
    }
    return this.http
      .post<PayloadResponse>(`${this.uri}add`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  update(params: IEndTrial[]): Observable<PayloadResponse> {
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
        .put<PayloadResponse>(`${this.uri}update`, params)
        .pipe(
          catchError((err: HttpErrorResponse) => this.message.multiError(err))
        );
    }
    return this.http.put<PayloadResponse>(`${this.uri}update`, params);
  }

  delete(params: IEndTrial[]): Observable<PayloadResponse> {
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
        .delete<PayloadResponse>(`${this.uri}delete`, {
          body: params,
        })
        .pipe(
          catchError((err: HttpErrorResponse) => this.message.multiError(err))
        );
    }
    return this.http.delete<PayloadResponse>(`${this.uri}delete`, {
      body: params,
    });
  }
}
