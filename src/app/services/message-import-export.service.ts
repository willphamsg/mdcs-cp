import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { IDepoList } from '@app/models/depo';
import { IMessageDataFile } from '@app/models/parameter-management';
import { IMessageDataImportSearchRequest } from '@app/models/message-management';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { catchError, map, Observable, of } from 'rxjs';
import { MessageService } from './message.service';
import { DynamicEndpoint } from './dynamic-endpoint';
import { IParams, PayloadResponse } from '@app/models/common';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class MessageDataImportExportService {
  private uri = `${environment.gateway}message-data/`;
  private handler = inject(HttpBackend);

  constructor(
    private http: HttpClient,
    public dialog: MatDialog,
    private auth: AuthService,
    private message: MessageService,
    private dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('common', this.uri);
  }

  manage(params: IParams, type: string) {
    if (type === 'import') {
      return this.searchImport(params);
    } else {
      return this.searchExport(params);
    }
  }

  /**
   * Legacy search method - to be deprecated
   * Use searchImportByGroupId for new workflow
   */
  searchImport(params: IParams): Observable<PayloadResponse> {
    this.http = new HttpClient(this.handler);
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);
    headers = headers.set('Content-Type', 'application/json');

    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Dummy data fetched successfully',
        payload: {
          ...DummyData,
          parameter_file_data: DummyData?.parameter_file_data,
        },
      };
      return of(dummyData);
    }
    return this.http
      .post<PayloadResponse>(`${this.uri}import/search`, params, {
        headers: headers,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  /**
   * Search imported message data by group identifier
   * This is the new workflow after file upload returns grp_identifier
   *
   * @param grpIdentifier - The group identifier returned from file upload
   * @returns Observable containing the search results
   */
  searchImportByGroupId(grpIdentifier: string): Observable<PayloadResponse> {
    this.http = new HttpClient(this.handler);
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);
    headers = headers.set('Content-Type', 'application/json');

    const searchRequest: IMessageDataImportSearchRequest = {
      grp_identifier: grpIdentifier,
    };

    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'INFO 2020',
        timestamp: Date.now(),
        message: 'Dummy data fetched successfully',
        payload: {
          records_count: DummyData.message_data_import?.length || 0,
          message_data_import: DummyData.message_data_import || [],
        },
      };
      return of(dummyData);
    }

    return this.http
      .post<PayloadResponse>(`${this.uri}import/search`, searchRequest, {
        headers: headers,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  searchExport(params: IParams): Observable<PayloadResponse> {
    this.http = new HttpClient(this.handler);
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);
    headers = headers.set('Content-Type', 'application/json');

    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Dummy data fetched successfully',
        payload: {
          ...DummyData,
          param_file_export_entity_pgn: DummyData?.parameter_file_data,
        },
      };
      return of(dummyData);
    }
    return this.http
      .post<PayloadResponse>(`${this.uri}export/search`, params, {
        headers: headers,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  getImportedList(): Observable<IMessageDataFile[]> {
    if (environment.useDummyData) {
      const dummyData = DummyData.message_data_import;
      return of(dummyData);
    }
    return this.http.get<IMessageDataFile[]>('');
  }

  // Move all depot related in DepotService once API integrated
  getDepotService(): Observable<IDepoList[]> {
    if (environment?.useDummyData) {
      const dummyData = DummyData.dagw_depot_list;

      return of(dummyData).pipe(
        map(data => {
          return data.map(depot => ({
            ...depot,
            value: depot.depot_name,
          }));
        })
      );
    }

    return this.http.get<IDepoList[]>('');
  }

  /**
   * Upload message data file(s) and get group identifier
   *
   * Expected response format:
   * {
   *   "status": 200,
   *   "status_code": "INFO 2020",
   *   "timestamp": 1748928360523,
   *   "payload": {
   *     "grp_identifier": "41a1efe8a1f3b41a"
   *   }
   * }
   *
   * @param params - FormData containing the file to upload
   * @returns Observable with response containing grp_identifier
   */
  import(params: FormData): Observable<PayloadResponse> {
    this.http = new HttpClient(this.handler);
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);

    return this.http
      .post<PayloadResponse>(`${this.uri}import/upload/zip`, params, {
        headers: headers,
      })
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  export(params: any[]): Observable<PayloadResponse>;
  export(params: any[], returnBlob: boolean): Observable<Blob>;
  export(
    params: any[],
    returnBlob?: boolean
  ): Observable<PayloadResponse | Blob> {
    this.http = new HttpClient(this.handler);
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);

    if (environment?.useDummyData) {
      if (returnBlob) {
        // Return a dummy blob for testing
        const dummyBlob = new Blob(['dummy zip content'], {
          type: 'application/zip',
        });
        return of(dummyBlob);
      } else {
        const dummyData: PayloadResponse = {
          status: 200,
          status_code: 'SUCCESS',
          timestamp: Date.now(),
          message: 'Updated successfully',
          payload: DummyData,
        };
        return of(dummyData);
      }
    }

    if (returnBlob) {
      // Handle blob response for file download
      return this.http
        .post(`${this.uri}export/download/zip`, params, {
          headers: headers,
          responseType: 'blob',
        })
        .pipe(
          catchError((err: HttpErrorResponse) => {
            console.error('Blob download error:', err);
            return this.message.multiError(err);
          })
        );
    } else {
      // Handle JSON response
      headers = headers.set('Content-Type', 'application/json');
      return this.http
        .post<PayloadResponse>(`${this.uri}export/download/zip`, params, {
          headers: headers,
        })
        .pipe(
          catchError((err: HttpErrorResponse) => this.message.multiError(err))
        );
    }
  }

  /**
   * Send message export request for selected date
   *
   * @param dateSelected - Selected date in ISO format
   * @returns Observable with response
   */
  sendMessageExportRequest(dateSelected: string): Observable<PayloadResponse> {
    const requestBody = {
      date_selected: dateSelected,
    };

    let headers = new HttpHeaders();
    headers = headers.set('Authorization', `Bearer ${this.auth.getToken()}`);
    headers = headers.set('Content-Type', 'application/json');

    if (environment?.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Message export request sent successfully',
        payload: {},
      };
      return of(dummyData);
    }

    return this.http
      .post<PayloadResponse>(
        `${this.uri}export/send-message-request`,
        requestBody,
        { headers: headers }
      )
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }
}
