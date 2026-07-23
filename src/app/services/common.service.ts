import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '@env/environment';
import { DynamicEndpoint } from './dynamic-endpoint';
import {
  DepoRequest,
  IOperatorList,
  PayloadResponse,
} from '@app/models/common';
import { BehaviorSubject, catchError, Observable, of } from 'rxjs';
import { MessageService } from './message.service';
import { IDepoList } from '@app/models/depo';

@Injectable({
  providedIn: 'root',
})
export class CommonService {
  private uriSettings = environment.gateway + '';
  private uri = environment.gateway + 'svc-provider/';
  private uriGeneralInfo = environment.gateway + 'general-information';
  private operatorList: BehaviorSubject<IOperatorList[]> = new BehaviorSubject<
    IOperatorList[]
  >([]);
  operatorList$: Observable<IOperatorList[]> = this.operatorList.asObservable();
  constructor(
    private http: HttpClient,
    private message: MessageService,
    private dynamic: DynamicEndpoint
  ) {
    this.uriSettings = this.dynamic.setDynamicEndpoint('', this.uriSettings);
    this.uri = this.dynamic.setDynamicEndpoint('common', this.uri);
    this.uriGeneralInfo = this.dynamic.setDynamicEndpoint(
      '',
      this.uriGeneralInfo
    );
  }

  validateBusNumber(e: KeyboardEvent): boolean {
    const inputElement = e.target as HTMLInputElement;
    const input = inputElement.value;
    const key = e.key;

    // Allow control keys
    if (
      ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(key)
    ) {
      return true;
    }

    // Block if not alphanumeric
    if (!/^[a-zA-Z0-9]$/.test(key)) {
      e.preventDefault();
      return false;
    }

    // Get cursor position to simulate insertion at the correct position
    const cursorPos = inputElement.selectionStart || 0;
    const selectionEnd = inputElement.selectionEnd || 0;

    // Simulate the new value after inserting the key at cursor position
    const simulated =
      input.substring(0, cursorPos) + key + input.substring(selectionEnd);

    if (simulated.length > 8) {
      e.preventDefault();
      return false;
    }

    // Format: 2–3 letters, 4 digits, optional final letter
    const livePattern = /^[a-zA-Z]{0,3}[0-9]{0,4}[a-zA-Z]?$/;

    if (!livePattern.test(simulated)) {
      e.preventDefault();
      return false;
    }

    return true;
  }

  updateOperatorList(updateOperator: IOperatorList[]) {
    this.operatorList.next(updateOperator);
  }

  search(params: DepoRequest): Observable<PayloadResponse> {
    return this.http
      .post<PayloadResponse>(`${this.uri}search`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  getDepotIds(data: IDepoList[]) {
    // Map the depot_id from each object and return as an array
    return data.map(item => item.depot_id);
  }

  getSettingDefault(): Observable<any> {
    return this.http.get<any>(`${this.uriSettings}settings/default`);
  }

  getGeneralInformation(isDagw: boolean): Observable<PayloadResponse> {
    const uri = `${environment.gateway}general-information`;
    // Temporary is hardcode to always display data. why be replace when BE create API for this
    if (!environment.useDummyData) {
      const dummyData: PayloadResponse = {
        status: 200,
        status_code: 'SUCCESS',
        timestamp: Date.now(),
        message: 'Dummy data fetched successfully',
        payload: {
          general_information: {
            version: 'MDCS.A.01.01.00.000AFHACNS',
            service_provider: 'SBST',
            system_connection: [
              { name: 'BOCC', status: 1 },
              { name: 'PMDS', status: 1 },
              { name: 'ABCDE', status: 0 },
              { name: 'FGHIJ', status: 1 },
              { name: 'KLMNO', status: 0 },
            ],
            pdt_status: 0,
          },
        },
      };
      return of(dummyData);
    }

    return this.http
      .get<PayloadResponse>(uri)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }
}
