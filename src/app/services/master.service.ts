import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { IParams, PayloadResponse, VehicleRequest } from '../models/common';
import { Observable, catchError, of } from 'rxjs';
import { IVehicleDelete, VehicleList } from '../models/vehicle-list';
import { MatDialog } from '@angular/material/dialog';
import { MessageService } from './message.service';
import { environment } from '@env/environment';
import DummyData from '@data/db.json';
import { DynamicEndpoint } from './dynamic-endpoint';
@Injectable({
  providedIn: 'root',
})
export class MasterService {
  private uri = environment.gateway + 'master-bus-list/';
  constructor(
    private readonly http: HttpClient,
    public readonly dialog: MatDialog,
    private readonly message: MessageService,
    private readonly dynamic: DynamicEndpoint
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
    //       master_bus_list: DummyData?.master_bus_list,
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

  searchOld(params: VehicleRequest): Observable<PayloadResponse> {
    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Dummy data fetched successfully',
        payload: {
          ...DummyData,
          master_bus_list: DummyData?.master_bus_list,
        },
      };
      return of(dummyData);
    }
    return this.http
      .post<PayloadResponse>(`${this.uri}search`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  add(params: VehicleList): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Added successfully',
    //     payload: params,
    //   };
    //   return of(dummyData);
    // }
    return this.http
      .post<PayloadResponse>(`${this.uri}save`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  delete(params: IVehicleDelete[]): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Added successfully',
    //     payload: params,
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

  find(params: any): Observable<PayloadResponse> {
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
      .post<PayloadResponse>(`${this.uri}find-info  `, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }
}
