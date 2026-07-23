import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { IParams, PayloadResponse } from '../models/common';
import { ITrialDeviceSelection } from '../models/parameter-trial';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '@env/environment';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';

@Injectable({
  providedIn: 'root',
})
export class TrialDeviceSelectionService {
  private uri = environment.gateway + 'parameter/trial-device/';
  constructor(
    private readonly http: HttpClient,
    public readonly dialog: MatDialog,
    private readonly message: MessageService,
    private readonly dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('param', this.uri);
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
    return this.http
      .post<PayloadResponse>(`${this.uri}search`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  manage(params: ITrialDeviceSelection[]): Observable<PayloadResponse> {
    return this.update(params);
  }

  add(params: ITrialDeviceSelection[]): Observable<PayloadResponse> {
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

  update(params: ITrialDeviceSelection[]): Observable<PayloadResponse> {
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
    return this.http.post<PayloadResponse>(`${this.uri}update`, params);
  }

  delete(params: ITrialDeviceSelection[]): Observable<PayloadResponse> {
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
