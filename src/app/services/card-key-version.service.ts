import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { BusRequest, IParams, PayloadResponse } from '../models/common';
import { ICardKeyVersion } from '../models/card-key-version';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '@env/environment';
import DummyData from '@data/db.json';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';

@Injectable({
  providedIn: 'root',
})
export class ManageCardKeyVersionService {
  private uri = environment.gateway + 'card-key-version-summary/';
  constructor(
    private http: HttpClient,
    public dialog: MatDialog,
    private message: MessageService,
    private dynamic: DynamicEndpoint
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
