import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DepoRequest, PayloadResponse } from '../models/common';
import { BehaviorSubject, Observable, of, catchError } from 'rxjs';
import DummyData from '@data/db.json';
import { IDepoList } from '@models/depo';
import { DynamicEndpoint } from './dynamic-endpoint';

@Injectable({
  providedIn: 'root',
})
export class DepoService {
  private uri = environment.gateway + 'depot/';

  private depo: BehaviorSubject<string> = new BehaviorSubject<string>('');
  private depoList: BehaviorSubject<IDepoList[]> = new BehaviorSubject<
    IDepoList[]
  >([]);
  depoList$: Observable<IDepoList[]> = this.depoList.asObservable();
  depo$: Observable<string> = this.depo.asObservable();
  constructor(
    private http: HttpClient,
    private dynamic: DynamicEndpoint
  ) {
    this.uri = this.dynamic.setDynamicEndpoint('common', this.uri);
  }

  search(params: DepoRequest): Observable<PayloadResponse> {
    // if (environment?.useDummyData) {
    //   // const dummyData: PayloadResponse = {
    //   //   status: 200,
    //   //   status_code: 'SUCCESS',
    //   //   timestamp: Date.now(),
    //   //   message: 'Dummy data fetched successfully',
    //   //   payload: DummyData,
    //   // };
    //   // // return of(dummyData);
    //   return this.http.post<PayloadResponse>(`${this.uri}search`, params);
    // }
    return this.http.post<PayloadResponse>(`${this.uri}search`, params);
  }

  updateDepo(updateDepo: string) {
    this.depo.next(updateDepo);
  }

  updateDepoList(updateDepo: IDepoList[]) {
    this.depoList.next(updateDepo);
  }
}
