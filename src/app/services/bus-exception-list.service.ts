import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { Observable, of } from 'rxjs';
import { IParams, PayloadResponse } from '../models/common';
import { DynamicEndpoint } from './dynamic-endpoint';

@Injectable({
  providedIn: 'root',
})
export class ManageBusExceptionListService {
  private uri = environment.gateway + 'operational-bus-list/';
  constructor(
    private http: HttpClient,
    public dialog: MatDialog,
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
      return of(dummyData);
    }
    return this.http.post<PayloadResponse>(`${this.uri}search`, params);
  }
}
