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
  private uri = environment.gateway + 'event-history/';
  constructor(
    private readonly http: HttpClient,
    private readonly message: MessageService,
    private readonly dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('common', this.uri);
  }

  search(params: IParams): Observable<PayloadResponse> {
    return this.http.post<PayloadResponse>(`${this.uri}search`, params);
  }
}
