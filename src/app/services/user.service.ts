import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PayloadResponse } from '../models/common';
import { DynamicEndpoint } from './dynamic-endpoint';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private uri = environment.gateway;

  constructor(
    private http: HttpClient,
    private dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('common', this.uri);
  }
  // search(params: PayloadRequest): Observable<PayloadResponse> {
  //   return this.http.post<PayloadResponse>(`${this.uri}/search`, params);
  // }

  userProfile(): Observable<PayloadResponse> {
    return this.http.get<PayloadResponse>(`${this.uri}profile/fetch`);
  }
}
