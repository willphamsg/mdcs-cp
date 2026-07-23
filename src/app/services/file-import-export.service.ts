import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { IDepoList } from '@app/models/depo';
import { IFile } from '@app/models/parameter-management';
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
export class FileImportExportService {
  private uri = environment.gateway + 'param/';
  constructor(
    private readonly http: HttpClient,
    public readonly dialog: MatDialog,
    private readonly auth: AuthService,
    private readonly message: MessageService,
    private readonly dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('param', this.uri);
  }

  manage(params: IParams, type: string) {
    if (type === 'import') {
      return this.searchImport(params);
    } else {
      return this.searchExport(params);
    }
  }

  searchImport(params: IParams): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Dummy data fetched successfully',
    //     payload: {
    //       ...DummyData,
    //       parameter_file_data: DummyData?.parameter_file_data,
    //     },
    //   };
    //   return of(dummyData);
    // }
    return this.http
      .post<PayloadResponse>(`${this.uri}import/search`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  searchExport(params: IParams): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Dummy data fetched successfully',
    //     payload: {
    //       ...DummyData,
    //       param_file_export_entity_pgn: DummyData?.parameter_file_data,
    //     },
    //   };
    //   return of(dummyData);
    // }

    return this.http
      .post<PayloadResponse>(`${this.uri}export/search`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  getImportedList(): Observable<IFile[]> {
    if (environment.useDummyData) {
      const dummyData = DummyData.parameter_file_data;

      return of(dummyData);
    }
    return this.http.get<IFile[]>('');
  }

  // Move all depot related in DepotService once API integrated
  getDepotService(): Observable<IDepoList[]> {
    // if (environment?.useDummyData) {
    //   const dummyData = DummyData.dagw_depot_list;

    //   return of(dummyData).pipe(
    //     map(data => {
    //       return data.map(depot => ({
    //         ...depot,
    //         value: depot.depot_name,
    //       }));
    //     })
    //   );
    // }

    return this.http.get<IDepoList[]>('');
  }

  // import(params: FormData) {
  //   const headers = new HttpHeaders({
  //     Authorization: `Bearer ${this.auth.getToken()}`
  //   });
  //   return this.http
  //     .post<PayloadResponse>(`${this.uri}import/upload/zip`, params, { headers })
  //     .pipe(
  //       catchError((err: HttpErrorResponse) => this.message.multiError(err))
  //     );
  // }

  import(params: FormData) {
    return this.http
      .post<PayloadResponse>(`${this.uri}import/upload/zip`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  exportFileRequest(params: any): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Updated successfully',
    //     payload: DummyData,
    //   };
    //   return of(dummyData);
    // }
    return this.http
      .post<PayloadResponse>(`${this.uri}export/send-file-request`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  exportStatus(params: any): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Updated successfully',
    //     payload: DummyData,
    //   };
    //   return of(dummyData);
    // }

    return this.http
      .post<PayloadResponse>(`${this.uri}export/search-export-status`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  export(params: any): Observable<any> {
    // if (environment?.useDummyData) {
    //   console.log('[export] executing using dummy data.');
    //   // Return a dummy response with blob and filename
    //   const dummyBlob = new Blob(['Dummy file content'], {
    //     type: 'application/zip',
    //   });
    //   return of({
    //     blob: dummyBlob,
    //     filename: 'parameter-export-dummy.zip',
    //   });
    // }

    return this.http
      .post(`${this.uri}export/download-zip`, params, {
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((response: any) => {
          let filename = 'parameter-export.zip'; // Default filename

          // Try to extract filename from Content-Disposition header
          const contentDisposition = response.headers.get(
            'Content-Disposition'
          );

          if (contentDisposition) {
            const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(
              contentDisposition
            );
            if (matches?.[1]) {
              filename = matches[1].replace(/['"]/g, '');
            }
          }

          return {
            blob: response.body,
            filename: filename,
          };
        }),
        catchError((err: HttpErrorResponse) => {
          return this.message.multiError(err);
        })
      );
  }
}
