import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { PayloadResponse, IParams } from '../models/common';
import { IParameterVersionSummary } from '../models/parameter-trial';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '@env/environment';
import DummyData from '@data/db.json';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';

@Injectable({
  providedIn: 'root',
})
export class ParameterVersionSummaryService {
  private uri = environment.gateway + 'parameter-version-summary/';
  constructor(
    private http: HttpClient,
    public dialog: MatDialog,
    private message: MessageService,
    private dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('param', this.uri);
  }

  search(params: IParams, tab: string): Observable<PayloadResponse> {
    return this.http.post<PayloadResponse>(`${this.uri}search-${tab}`, params);
  }

  add(params: IParameterVersionSummary[]): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Added successfully',
    //     payload: DummyData,
    //   };
    //   return of(dummyData);
    // }
    return this.http
      .post<PayloadResponse>(`${this.uri}add`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  update(params: IParameterVersionSummary[]): Observable<PayloadResponse> {
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
    return this.http.put<PayloadResponse>(`${this.uri}update`, params);
  }

  delete(params: IParameterVersionSummary[]): Observable<PayloadResponse> {
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
    return this.http.delete<PayloadResponse>(`${this.uri}delete`, {
      body: params,
    });
  }
}
