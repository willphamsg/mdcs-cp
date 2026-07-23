import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { DailyReportRequest, PayloadResponse } from '@models/common';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AdhocReportService {
  private uri = environment.gateway + 'master-bus-list/';
  constructor(
    private http: HttpClient,
    public dialog: MatDialog
  ) {}

  search(params: DailyReportRequest): Observable<PayloadResponse> {
    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Dummy data fetched successfully',
        payload:
          params?.report_type === 'all'
            ? DummyData
            : {
                ...DummyData,
                'adhoc-reports': DummyData['adhoc-reports']?.filter(
                  item =>
                    item?.tab_filter?.toLocaleLowerCase() ===
                    params?.report_type.toLocaleLowerCase()
                ),
              },
      };
      return of(dummyData);
    }
    return this.http.post<PayloadResponse>(`${this.uri}search`, params);
  }

  getServiceProvider(): Observable<PayloadResponse> {
    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Dummy data fetched successfully',
        payload: DummyData.service_provider,
      };
      return of(dummyData);
    }
    return this.http.get<PayloadResponse>(`${this.uri}service-provider`);
  }
}
