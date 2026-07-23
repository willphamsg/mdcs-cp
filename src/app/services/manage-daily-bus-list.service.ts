import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { BusRequest, IParams, PayloadResponse } from '../models/common';
import { BusList } from '../models/bus-list';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '@env/environment';
import DummyData from '@data/db.json';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';

@Injectable({
  providedIn: 'root',
})
export class ManageDailyBusListService {
  private uri = environment.gateway + 'daily-bus-list/';
  constructor(
    private http: HttpClient,
    public dialog: MatDialog,
    private message: MessageService,
    private dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('bus', this.uri);
  }

  search(params: IParams): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Dummy data fetched successfully',
    //     payload: {
    //       ...DummyData,
    //       daily_bus_list: DummyData?.daily_bus_list,
    //     },
    //   };
    //   return of(dummyData);
    // }
    return this.http
      .post<PayloadResponse>(`${this.uri}search`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  manage(params: BusList[], action: string): Observable<PayloadResponse> {
    if (action == 'update') {
      return this.update(params);
    } else if (action == 'delete') {
      return this.delete(params);
    } else {
      return this.add(params);
    }
  }

  add(params: BusList[]): Observable<PayloadResponse> {
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

  update(params: BusList[]): Observable<PayloadResponse> {
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
      .put<PayloadResponse>(`${this.uri}update`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  delete(params: BusList[]): Observable<PayloadResponse> {
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
      .delete<PayloadResponse>(`${this.uri}delete`, {
        body: params,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }
}
