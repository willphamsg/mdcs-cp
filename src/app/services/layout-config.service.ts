import { Injectable } from '@angular/core';
import { ILayoutConfig, layoutConfigurations } from '@app/models/layout-config';
import DummyData from '@data/db.json';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LayoutConfigService {
  private originalLayoutConfig: ILayoutConfig | null = null;

  private layoutConfigSubject = new BehaviorSubject<ILayoutConfig | null>(null);
  layoutConfig$ = this.layoutConfigSubject.asObservable();

  private deviceCodeSubject = new BehaviorSubject<string>('');
  deviceCode$ = this.deviceCodeSubject.asObservable();

  private topFieldValuesSubject = new BehaviorSubject<{ [key: string]: any }>(
    {}
  );
  topFieldValues$ = this.topFieldValuesSubject.asObservable();

  private middleSelectionSubject = new BehaviorSubject<{ [key: string]: any }>(
    {}
  );
  middleSelection$ = this.middleSelectionSubject.asObservable();

  private topDataSubject = new BehaviorSubject<any>(null);
  topData$ = this.topDataSubject.asObservable();

  private userTableSubject = new BehaviorSubject<any>(null);
  userTable$ = this.userTableSubject.asObservable();

  private middleDataSubject = new BehaviorSubject<any>(null);
  middleData$ = this.middleDataSubject.asObservable();

  private bottomDataSubject = new BehaviorSubject<any>(null);
  bottomData$ = this.bottomDataSubject.asObservable();

  setLayoutConfig(pageKey: string): void {
    const config = layoutConfigurations[pageKey];

    this.deviceCodeSubject.next(pageKey);
    this.originalLayoutConfig = config;
    this.layoutConfigSubject.next(config);

    if (config?.callApiOnPageSelect) {
      this.triggerApi({});
    }
  }

  updateFieldValues(fieldValues: { [key: string]: any }): void {
    this.topFieldValuesSubject.next(fieldValues);

    const config = this.layoutConfigSubject.value;
    if (config) {
      this.triggerApi(fieldValues);
    }
  }

  areRequiredFieldsValid(
    fieldValues: { [key: string]: any },
    requiredFields: string[]
  ): boolean {
    return requiredFields.every(field => !!fieldValues[field]);
  }

  triggerApi(params?: { [key: string]: any }): void {
    const deviceCode = this.deviceCodeSubject.value;
    let dummyData;
    if (!!deviceCode)
      dummyData = DummyData?.[deviceCode as keyof typeof DummyData];
    if (!dummyData) dummyData = DummyData.bank_card_bin;
    const { headers, values } = this.mapTableData(dummyData);

    this.updateTopData({
      userData: DummyData.parameter_viewer_depot_data,
    });

    this.updateUserTable({
      userData: DummyData.parameter_viewer_depot_data,
    });
    this.updateBottomData({
      column: headers.map((header: any) => ({
        columnDef: header.id,
        header: header.name,
        sortable: header.sortable || false,
        subHeader: header.subHeader || header.children || [],
      })),
      dataSource: values,
    });
  }

  mapTableData(responseData: any): { headers: any[]; values: any[] } {
    const headers = [
      { id: 'id', name: 'No.' },
      ...responseData.tableDetails.header,
    ];

    const values = responseData.tableDetails.values.map(
      (data: any, index: number) => ({
        id: index + 1,
        ...data,
      })
    );

    return { headers, values };
  }

  updateTopData(data: any): void {
    this.topDataSubject.next(data);
  }

  updateUserTable(data: any): void {
    this.userTableSubject.next(data);
  }

  updateMiddleData(data: any): void {
    this.middleDataSubject.next(data);
  }

  updateBottomData(data: any): void {
    this.bottomDataSubject.next(data);
  }

  reset(): void {
    this.layoutConfigSubject.next(null);
    this.topDataSubject.next(null);
    this.userTableSubject.next(null);
    this.middleDataSubject.next(null);
    this.bottomDataSubject.next(null);
  }

  completeSubs(): void {
    this.topDataSubject.complete();
    this.middleDataSubject.complete();
    this.bottomDataSubject.complete();
  }
}
