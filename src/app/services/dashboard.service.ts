import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { PayloadResponse } from '../models/common';
import { IConnectedBusParams } from '../models/bus-operation';
import { Observable, catchError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MessageService } from './message.service';
import { environment } from '@env/environment';
import { DynamicEndpoint } from './dynamic-endpoint';
@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly busUri = environment.gateway + '';
  private readonly commonUri = environment.gateway + '';
  private readonly paramUri = environment.gateway + '';
  constructor(
    private readonly http: HttpClient,
    public dialog: MatDialog,
    private readonly message: MessageService,
    private readonly dynamic: DynamicEndpoint
  ) {
    this.busUri = this.dynamic.setDynamicEndpoint('bus', this.busUri);
    this.commonUri = this.dynamic.setDynamicEndpoint('common', this.commonUri);
    this.paramUri = this.dynamic.setDynamicEndpoint('param', this.paramUri);
  }

  getDagwStatus(): Observable<PayloadResponse> {
    return this.http.get<PayloadResponse>(
      `${this.commonUri}system-info/dagw-system-status`
    );
  }

  getBusTransferCount(): Observable<PayloadResponse> {
    return this.http.get<PayloadResponse>(
      `${this.busUri}bus-transfer/count-in-progress`
    );
  }

  getTaskList(): Observable<PayloadResponse> {
    return this.http.get<PayloadResponse>(
      `${this.paramUri}parameter/trial/status-count`
    );
  }

  search(params: IConnectedBusParams): Observable<PayloadResponse> {
    return this.http
      .post<PayloadResponse>(
        `${this.busUri}bus-operation-status/connected-buses`,
        params
      )
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }
}
