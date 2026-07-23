import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DynamicEndpoint } from './dynamic-endpoint';
import { environment } from '@env/environment';
import { catchError, Observable } from 'rxjs';
import { MessageService } from './message.service';
import {
  DAGWDailyReportRequest,
  PayloadResponse,
} from '../models/common';

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private uri = environment.gateway + 'ssrs-report/';
  constructor(
    private http: HttpClient,
    private dynamic: DynamicEndpoint,
    private message: MessageService
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('report', this.uri);
  }

  // getReport(reportFileName: string, params: string) {
  //   return this.http.get(`${this.uri}get-report?reportFileName=${reportFileName}${params}`, { responseType: 'text' });
  // }

  getReportURL(reportFileName: string, params: string): string {
    console.log('getReportURL', { reportFileName, params });
    if (environment.useDummyData) {
      return `https://ec2-13-250-26-197.ap-southeast-1.compute.amazonaws.com/ReportServer/Pages/ReportViewer.aspx?/BusAuditTrailReport&rs:Embed=true&rs:Format=HTML5&rs:Command=Render&rc:Toolbar=true&rc:Parameters=false&SPId=16&BusinessDay=2026-04-17&DepotId=970&DepotId=971&DepotId=972&DepotId=973&DepotId=974&DepotId=975&Username=daily-report`;
    }
    return `${this.uri}ReportServer/Pages/ReportViewer.aspx?/${reportFileName}${params}`;
  }

  getReportHtml(reportFileName: string, params: string): Observable<string> {
    const getRep = this.http.get(this.getReportURL(reportFileName, params), {
      headers: new HttpHeaders({}),
      responseType: 'text',
    });
    return getRep;
  }


  getReportData(params: DAGWDailyReportRequest): Observable<any> {
    const uri = this.dynamic.setDynamicEndpoint('report', environment.gateway + 'dagw-report/');
    return this.http
    .post<PayloadResponse>(`${uri}get-report`, params)
    .pipe(
      catchError((err: HttpErrorResponse) => this.message.multiError(err))
    );
  }
}
