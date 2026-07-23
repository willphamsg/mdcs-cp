import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PayloadResponse, DAGWDailyReportRequest } from '@models/common';
import { Observable, of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '@env/environment';
import DummyData from '@data/db.json';
import { DynamicEndpoint } from './dynamic-endpoint';
@Injectable({
  providedIn: 'root',
})
export class DailyReportService {
  private readonly uri: string;
  constructor(
    private readonly http: HttpClient,
    public readonly dialog: MatDialog,
    private readonly dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('report', environment.gateway + 'dagw-report/');
  }

  search(params: DAGWDailyReportRequest): Observable<PayloadResponse> {
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
    return this.http.post<PayloadResponse>(`${this.uri}get-report`, params);
  }

  download(params: {
    report_name: string;
    business_day: string | null;
    format: string;
    svc_prov_id: number;
    depot_id: number;
  }): Observable<Blob> {
    return this.http.post(`${this.uri}download`, params, {
      responseType: 'blob',
    });
  }
}
