import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { IParams, PayloadResponse } from '../models/common';
import { MatDialog } from '@angular/material/dialog';
import { environment } from '@env/environment';
import DummyData from '@data/db.json';
import { MessageService } from './message.service';
import { IDepoList } from '@app/models/depo';
import { DynamicEndpoint } from './dynamic-endpoint';

@Injectable({
  providedIn: 'root',
})
export class DagwParameterSummaryService {
  private readonly uri = environment.gateway + 'dagw-param-version-summary/';
  private readonly depotListSubject: BehaviorSubject<IDepoList[]> = new BehaviorSubject<
    IDepoList[]
  >([]);

  constructor(
    private readonly http: HttpClient,
    public dialog: MatDialog,
    private readonly dynamic: DynamicEndpoint,
    private readonly message: MessageService
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('param', this.uri);
  }

  get depotList(): IDepoList[] {
    return this.depotListSubject.value;
  }

  search(params: IParams): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Dummy data fetched successfully',
    //     payload: DummyData,
    //   };
    //   return of(dummyData);
    // }
    const requestBody: any = {
      ...params,
      search_select_filter: {
        ...params.search_select_filter,

        effective_date_live_from: this.emptyDateToNull(
          params.search_select_filter?.['effective_date_live_from']
        ),
        effective_date_live_till: this.emptyDateToNull(
          params.search_select_filter?.['effective_date_live_till']
        ),
        effective_date_trial_from: this.emptyDateToNull(
          params.search_select_filter?.['effective_date_trial_from']
        ),
        effective_date_trial_till: this.emptyDateToNull(
          params.search_select_filter?.['effective_date_trial_till']
        ),
      },
    };

    return this.http
      .post<PayloadResponse>(`${this.uri}search`, requestBody)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  // REMOVE THIS, USE SEARCH WHEN API IS AVAILABLE
  getDepotService(type: string): Observable<IDepoList[]> {
    if (environment?.useDummyData) {
      const dummyData = DummyData.dagw_depot_list;

      return of(dummyData).pipe(
        tap((depots: IDepoList[]) => {
          this.depotListSubject.next(depots);
        }),

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

  private emptyDateToNull(value: unknown): string | null {
    if (value === '' || value === undefined || value === null) {
      return null;
    }

    return value as string;
  }
}
