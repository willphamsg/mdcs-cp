import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { environment } from '@env/environment';
import { IParams, PayloadResponse } from '@app/models/common';
import { catchError, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BusOperationService {
  private uri = environment.gateway + 'bus-operation-status/';
  constructor(
    private readonly http: HttpClient,
    public readonly dialog: MatDialog,
    private readonly message: MessageService,
    private readonly dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('bus', this.uri);
  }

  search(params: IParams): Observable<PayloadResponse> {
    return this.http
      .post<PayloadResponse>(`${this.uri}search`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }
}
