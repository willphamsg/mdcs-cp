import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IParams, PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import {
  IAudtitLog,
  IEodProcess,
  ISystemInfo,
  IUpdateType,
} from '@app/models/maitenance';
import DummyData from '@data/db.json';
import { environment } from '@env/environment';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { DynamicEndpoint } from './dynamic-endpoint';

export interface DepotParam {
  depot_id: string;
}

/**
 * Deferred: remove unused code when API is integrated.
 * NEEDS TO REWORK THIS SERVICE WHEN API IS FINALIZED
 */
@Injectable({
  providedIn: 'root',
})
export class MaintenanceSharedService {
  private readonly selectedDepot = new BehaviorSubject<IDepoList | null>(null);

  private readonly formGroupSubject = new BehaviorSubject<FormGroup | null>(null);

  private readonly uriSystemInformation: string;
  private readonly uriDiagnostic: string;
  private readonly uriAuditTrail: string;
  private readonly uriEodProcess: string;
  private readonly triggerResetSubject = new Subject<void>();

  constructor(
    private readonly http: HttpClient,
    private readonly dynamic: DynamicEndpoint
  ) {
    this.uriSystemInformation = this.dynamic.setDynamicEndpoint(
      'common',
      environment.gateway + 'system-info/'
    );
    this.uriDiagnostic = this.dynamic.setDynamicEndpoint(
      'bus',
      environment.gateway + 'diagnostics/'
    );
    this.uriAuditTrail = this.dynamic.setDynamicEndpoint(
      'common',
      environment.gateway + 'audit-trail-log/'
    );
    this.uriEodProcess = this.dynamic.setDynamicEndpoint(
      'common',
      environment.gateway + 'eod-process/'
    );
  }
  // triggerReset$ = this.triggerResetSubject.asObservable();

  // emitTriggerReset(): void {
  //   this.triggerResetSubject.next();
  // }

  get formGroup$() {
    return this.formGroupSubject.asObservable();
  }

  setFormGroup(form: any): void {
    this.formGroupSubject.next(form);
  }

  resetFormGroup() {
    const currentFormGroup = this.formGroupSubject.value;
    if (currentFormGroup) {
      currentFormGroup.reset();
    }
  }

  // Getter for the observable
  get selectedDepot$(): Observable<IDepoList | null> {
    return this.selectedDepot.asObservable();
  }

  updateSelectedDepot(value: IDepoList | null): void {
    this.selectedDepot.next(value);
  }

  getTaskItems(depot: IDepoList): Observable<IEodProcess[]> {
    if (environment.useDummyData) {
      const dummyData: IEodProcess[] = DummyData.eod_process_tasks;
      return of(dummyData);
    }
    return this.http.get<IEodProcess[]>('');
  }

  getAuditLogItems(): Observable<IAudtitLog[]> {
    if (environment.useDummyData) {
      const dummyData = DummyData['audit-log-items'];

      return of(dummyData);
    }
    return this.http.get<IAudtitLog[]>('');
  }

  viewAuditTrail(params: IParams): Observable<PayloadResponse> {
    return this.http.post<PayloadResponse>(`${this.uriAuditTrail}view`, params);
  }

  getUpdateTypeItems(): Observable<IUpdateType[]> {
    if (environment.useDummyData) {
      const dummyData = DummyData['update-type'];
      return of(dummyData);
    }
    return this.http.get<IUpdateType[]>('');
  }

  getSystemInformation(
    depot_id: string,
    isDagw?: boolean
  ): Observable<ISystemInfo[]> {
    // if (environment.useDummyData) {
    //   // const dummyData: IStatusCategory[] = DummyData.diagnostics_item;
    //   // return this.http
    //   //   .post<PayloadResponse>(`${this.uri}system-info/fetch`, {
    //   //     depot_id,
    //   //     dagw: isDagw,
    //   //   })
    //   return this.http.get<ISystemInfo[]>('');
    // }

    return this.http.get<ISystemInfo[]>('');
  }

  getEODDate(): Observable<PayloadResponse> {
    return this.http.get<PayloadResponse>(`${this.uriEodProcess}eod-dates`);
  }

  eodCheckStatus(params: any): Observable<PayloadResponse> {
    return this.http.post<PayloadResponse>(
      `${this.uriEodProcess}check-eod-status`,
      params
    );
  }

  triggerForceEOD(): Observable<PayloadResponse> {
    return this.http.get<PayloadResponse>(`${this.uriEodProcess}force-eod`);
  }

  searchSystemInfo(params: DepotParam): Observable<PayloadResponse> {
    return this.http.post<PayloadResponse>(
      `${this.uriSystemInformation}fetch`,
      params
    );
  }

  searchDiagnostic(params: DepotParam): Observable<PayloadResponse> {
    // if (environment.useDummyData) {
    //   const dummyData: PayloadResponse = {
    //     status: 200,
    //     status_code: 'SUCCESS',
    //     timestamp: Date.now(),
    //     message: 'Dummy data fetched successfully',
    //     payload: DummyData.diagnostics_item,
    //   };
    //   // return of(dummyData);
    //   return this.http.post<PayloadResponse>(
    //     `${this.uriDiagnostic}view`,
    //     params
    //   );
    // }
    return this.http.post<PayloadResponse>(`${this.uriDiagnostic}view`, params);
  }
}
