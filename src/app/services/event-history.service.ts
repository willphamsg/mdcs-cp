import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { IParams, PayloadResponse } from '@app/models/common';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({
  providedIn: 'root',
})
export class EventHistoryService {
  private readonly uri: string;
  constructor(
    private readonly http: HttpClient,
    private readonly message: MessageService,
    private readonly dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('common', environment.gateway + 'event-history/');
  }

  search(params: IParams): Observable<PayloadResponse> {
    return this.http.post<PayloadResponse>(`${this.uri}search`, params);
  }
}
