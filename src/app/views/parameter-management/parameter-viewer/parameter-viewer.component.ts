import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  viewChild,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatAccordion, MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule, MatTabChangeEvent } from '@angular/material/tabs';
import { RouterModule } from '@angular/router';
import { BreadcrumbsComponent } from '@app/components/layout/breadcrumbs/breadcrumbs.component';
import { IDepoList } from '@app/models/depo';
import {
  IParameterList,
  IParameterViewerData,
  IParameterTab,
  IParameterMultipleVersion,
  IParameterJSONData,
  IParameterFileDetails,
  IParameterViewDetails,
  IParameterSubTypeAndFile,
} from '@app/models/parameter-management';
import { ParameterViewerService } from '@app/services/parameter-viewer.service';
import { Observable, of, Subject, takeUntil, combineLatest } from 'rxjs';
import { SelectDepotComponent } from './select-depot/select-depot.component';
import { SelectParameterVersionComponent } from './select-parameter-version/select-parameter-version.component';
import { ParameterViewerTableComponent } from './parameter-viewer-table/parameter-viewer-table.component';
import { DepoService } from '@app/services/depo.service';
import { AuthService } from '@app/services/auth.service';
import { SelectBusGroupComponent } from './select-bus-group/select-bus-group.component';
import { SelectServiceNoComponent } from './select-service-no/select-service-no.component';

enum ParameterCode {
  ApprovalDistributionPDT = 'Approval Distribution PDT',
  DirectDistributionPDT = 'Direct Distribution PDT',
}

@Component({
  selector: 'app-parameter-viewer',
  standalone: true,
  imports: [
    BreadcrumbsComponent,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    RouterModule,
    MatInputModule,
    MatSelectModule,
    MatSortModule,
    MatExpansionModule,
    CommonModule,
    MatMenuModule,
    MatSidenavModule,
    MatListModule,
    // SystemParametersComponent,
    // DeviceConfigurationComponent,
    // ApplicationParametersComponent,
    ReactiveFormsModule,
    SelectDepotComponent,
    SelectBusGroupComponent,
    SelectServiceNoComponent,
    SelectParameterVersionComponent,
    ParameterViewerTableComponent,
  ],
  templateUrl: './parameter-viewer.component.html',
  styleUrls: ['./parameter-viewer.component.scss'],
})
export class ParameterViewerComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  accordion = viewChild.required(MatAccordion);

  parameterSubTypeAndFile: IParameterSubTypeAndFile[] = [];
  parameterList$: Observable<IParameterList[]> = of([]);

  parameterMultipleVersion: IParameterMultipleVersion[] = [];
  parameterVersionSelected: IParameterViewDetails;

  tabIdx = 0;
  tabList: IParameterTab[] = [];

  sideNavHeader = 0;
  menuHeader: string;

  dataSource: IParameterViewerData | null = null;
  payload: IParameterJSONData;
  selected: number | undefined;
  selectedItem: string = '';
  selectedParameterFile: IParameterFileDetails;
  depots: IDepoList[] = [];
  depotSelected: string;
  isDepotSelected: boolean = false;
  svcProviderID = this.authService.getSVCProvider();
  isLocationSpecific: boolean = false;
  isMultipleVersion: boolean | undefined = false;

  noDataFound: boolean = false;

  isSVT: boolean = false;
  busGroupNoSelected: number | null = null;
  busGroupNoList: number[];
  payloadId: number | undefined;

  serviceNoSelected: number | null = null;
  serviceNoList: number[];

  parameterName: string | null = null;

  // TODO: Refactor retrieval of data... Probably use services efficiently
  constructor(
    private readonly parameterViewerService: ParameterViewerService,
    private readonly cdr: ChangeDetectorRef,
    private readonly depoService: DepoService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setActiveTab();
    this.loadTabItems();
    this.subscribeToDepoChanges();

    //this.loadParameterItems(this.sideNavHeader);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onTabChange(event: MatTabChangeEvent): void {
    this.accordion().closeAll();
    this.cdr.detectChanges();

    const selectedTab = this.tabList.find(
      tab => tab.label === event.tab.textLabel
    );
    if (selectedTab) {
      this.menuHeader = selectedTab.label;
      this.sideNavHeader = selectedTab.id;
      this.loadParameterItems(this.sideNavHeader);
    }
  }

  loadTabItems(): void {
    this.parameterViewerService
      .getSystemParametersTab()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: value => {
          if (value.status === 200) {
            this.tabList = value.payload.tabList;
            this.sideNavHeader = value.payload.tabList[0].id;
          }
        },
        complete: () => {
          this.loadParameterItems(this.sideNavHeader);
        },
      });
  }

  loadParameterItems(tabCode: number): void {
    this.parameterViewerService
      .getSystemParametersItems(tabCode)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: value => {
          if (value.status === 200) {
            this.parameterSubTypeAndFile = value.payload.devices;
          }
        },
      });
  }

  setActiveTab(): void {
    this.tabIdx = this.tabList.findIndex(idx => idx.id === this.sideNavHeader);
  }

  onSelectParameterFile(
    parameterFile: IParameterFileDetails,
    paramterCode: string
  ): void {
    this.selectedItem = paramterCode;
    this.selectedParameterFile = parameterFile;
    this.isSVT = false;
    this.busGroupNoSelected = null;
    this.busGroupNoList = [];

    // if (environment?.useDummyData) {
    //   return;
    // }

    // Reset data when change parameter file before load data
    this.noContent();
    this.depotSelected = '';

    // if (paramterCode === ParameterCode.ApprovalDistributionPDT) {
    //    const foundVersion = parameterFile.parameter_view_details.find(
    //     version => version.depot_id === Number(this.depotSelected)
    //   ) as IParameterViewDetails;
    //   this.isLocationSpecific = !foundVersion
    //     ? true
    //     : !foundVersion.is_location_specific;
    //   this.isMultipleVersion = !foundVersion
    //     ? false
    //     : foundVersion.is_multi_version;
    //   this.isDepotSelected = !this.isLocationSpecific;
    //   this.parameterVersionSelected = foundVersion;
    // } else {
    //   this.parameterVersionSelected = parameterFile.parameter_view_details[0];
    //   this.isLocationSpecific = !parameterFile.parameter_view_details[0] ? true :
    //   !parameterFile.parameter_view_details[0].is_location_specific;
    //   this.isMultipleVersion = !parameterFile.parameter_view_details[0] ? false :
    //   parameterFile.parameter_view_details[0].is_multi_version;

    //   this.isDepotSelected = !this.isLocationSpecific;
    // }

    this.parameterVersionSelected = parameterFile.parameter_view_details[0];
    this.isLocationSpecific = !parameterFile.parameter_view_details[0]
      ? true
      : !parameterFile.parameter_view_details[0].is_location_specific;
    this.isMultipleVersion = !parameterFile.parameter_view_details[0]
      ? false
      : parameterFile.parameter_view_details[0].is_multi_version;

    this.isDepotSelected = !this.isLocationSpecific;

    this.loadData(this.parameterVersionSelected, this.depotSelected);
  }

  subscribeToDepoChanges(): void {
    const depotList$ = this.depoService.depoList$;
    combineLatest([depotList$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([depotList]) => {
        this.depots = depotList;
        this.depotSelected = this.depots[0].depot_id;
      });
  }

  loadData(parameterVersionSelected: IParameterViewDetails, depot_id: string) {
    if (!parameterVersionSelected) {
      // This handles errors that are undefined
      this.noContent();
      return;
    }
    const depotid = this.isLocationSpecific ? '0' : depot_id;
    const params = {
      fileId: parameterVersionSelected.id,
      parameter_name: parameterVersionSelected.parameter_name,
      depot_id: Number(depotid),
      svc_provider_id: this.svcProviderID,
    };

    this.parameterMultipleVersion =
      this.selectedParameterFile.parameter_view_details;

    // this.parameterViewerService
    //   .getDataSource(params)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe({
    //     next: value => {
    //       this.dataSource = null;
    //       this.noDataFound = true;
    //       if (value.status === 200) {
    //         this.noDataFound = false;

    //         this.dataSource = value.payload.ParameterViewObjectList[0];
    //         this.parameterName = !value.payload?.ParameterViewObjectList[0]?.parameter_name ? "" : value.payload?.ParameterViewObjectList[0]?.parameter_name;

    //         this.parameterList$ = this.parameterViewerService.getParameterList(
    //           !value.payload.ParameterViewObjectList[0]?.parameter_name ? "" : value.payload.ParameterViewObjectList[0].parameter_name
    //         );

    //         this.payload = {
    //           parameter_name: this.parameterName,
    //           jsondata:
    //             value.payload?.ParameterViewObjectList[0]?.parameterPayloadDto?.jsondata || {},
    //         };

    //         if(this.dataSource?.bus_group_list) {
    //           this.isSVT = true;
    //           this.busGroupNoList = this.dataSource?.bus_group_list;
    //           this.payloadId = this.dataSource?.parameter_payload_id;
    //         }
    //       }
    //     },
    //     error: err => {
    //       // This handles errors that are not status 200 or custom returned
    //       this.noDataFound = true;
    //       this.dataSource = null;
    //       this.parameterList$ = of([]);
    //       this.payload = {
    //         parameter_name: '',
    //         jsondata: '',
    //       };
    //     },
    //   });
    this.parameterViewerService
      .getDataSource(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: value => {
          this.noContent();

          if (value.status !== 200) {
            return;
          }

          const matchedItem = this.findMatchedParameterItem(
            value.payload?.ParameterViewObjectList,
            parameterVersionSelected
          );

          if (matchedItem) {
            this.applyMatchedParameterItem(matchedItem, parameterVersionSelected);
          } else {
            this.noContent();
            if (parameterVersionSelected.is_location_specific)
              this.noParameterReturn();
          }
        },
        error: err => {
          this.noContent();
        },
      });
  }

  private findMatchedParameterItem(
    list: any[] | undefined,
    parameterVersionSelected: any
  ): any {
    if (!list || list.length === 0) {
      return null;
    }
    const exactMatch = list.find(
      (item: any) =>
        item.parameter_name === parameterVersionSelected.parameter_name
    );
    if (exactMatch) {
      return exactMatch;
    }
    // If no exact match and only one item, use it (common for PDT)
    return list.length === 1 ? list[0] : null;
  }

  private resolveParameterFileId(matchedItem: any, fallbackId: any): any {
    if (!matchedItem.fileId) {
      return fallbackId;
    }
    // Parse fileId properly (handle hex string format)
    if (
      typeof matchedItem.fileId === 'string' &&
      matchedItem.fileId.startsWith('0x')
    ) {
      return Number.parseInt(matchedItem.fileId, 16);
    }
    return matchedItem.fileId;
  }

  private applyMatchedParameterItem(
    matchedItem: any,
    parameterVersionSelected: any
  ): void {
    this.noDataFound = false;

    this.dataSource = matchedItem;
    this.parameterName = matchedItem.parameter_name || '';

    this.parameterList$ = this.parameterViewerService.getParameterList(
      this.parameterName!
    );

    const fileId = this.resolveParameterFileId(
      matchedItem,
      parameterVersionSelected.id
    );

    this.payload = {
      parameter_name: this.parameterName,
      jsondata: matchedItem.parameterPayloadDto?.jsondata || '',
      fileId: fileId,
    };

    if (matchedItem.bus_group_list) {
      this.isSVT = true;
      this.busGroupNoList = matchedItem.bus_group_list;
      this.payloadId = matchedItem.parameter_payload_id;
    }
  }


  noContent() {
    this.noDataFound = true;
    this.dataSource = null;
    this.parameterList$ = of([]);
    this.payload = {
      parameter_name: '',
      jsondata: '',
      fileId: this.parameterVersionSelected?.id,
    };
  }

  noParameterReturn() {
    const first = this.parameterMultipleVersion[0];
    this.parameterVersionSelected = {
      id: first.id,
      parameter_name: first.parameter_name.replace(/\.[^.]+$/, '.XXX'),
      depot_id: Number(this.depotSelected),
      svc_provider_id: first.svc_provider_id ?? 0,
      is_location_specific: first.is_location_specific ?? false,
      is_multi_version: first.is_multi_version ?? false,
      locationSpecific: first.locationSpecific ?? false,
      multiVersion: first.multiVersion ?? false,
      triable: first.triable ?? false, // Ensure this is always boolean
    };
  }

  loadServiceNo(selectedBusGroup: number | null) {
    const param = {
      bus_group_no: selectedBusGroup,
      parameter_payload_id: this.payloadId,
    };
    this.parameterViewerService
      .getSVTServiceNo(param)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: value => {
          if (value.status === 200) {
            this.serviceNoList = value.payload.ParameterServiceNumberList;
          }
        },
        error: err => {
          // This handles errors that are not status 200 or custom returned
          this.noContent();
        },
      });
  }

  loadSVTPayload(selectedServiceNo: number | null) {
    const param = {
      bus_service_no: selectedServiceNo,
      parameter_payload_id: this.payloadId,
    };
    this.parameterViewerService
      .getSVTPayload(param)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: value => {
          if (value.status === 200) {
            this.payload = {
              parameter_name: this.parameterName,
              jsondata:
                value.payload?.ParameterViewObjectList[0]?.parameterPayloadDto
                  ?.jsondata || {},
              fileId: this.parameterVersionSelected?.id,
            };
          }
        },
        error: err => {
          // This handles errors that are not status 200 or custom returned
          this.noContent();
        },
      });
  }

  handleSelectDepot(selectedDepot: string) {
    this.depotSelected = selectedDepot;
    // if (this.selectedItem === ParameterCode.ApprovalDistributionPDT) {
    //   const selectedVersion = this.parameterMultipleVersion.find(
    //     version => version.depot_id === Number(selectedDepot)
    //   );
    //   this.parameterVersionSelected = selectedVersion as IParameterViewDetails;
    // }
    const selectedVersion = this.parameterMultipleVersion.find(
      version => version.depot_id === Number(selectedDepot)
    );
    this.parameterVersionSelected = selectedVersion as IParameterViewDetails;

    if (!this.parameterVersionSelected) {
      this.noParameterReturn();
    }
    // When depot changes, reload data with the same parameter version
    // but different depot - this is where depot-specific filtering happens
    this.loadData(this.parameterVersionSelected, this.depotSelected);
  }

  handleSelectMultipleVersion(selectedVersion: IParameterViewDetails) {
    this.parameterVersionSelected = selectedVersion;
    this.loadData(this.parameterVersionSelected, this.depotSelected);
  }

  handleSelectBusGroup(selectedBusGroup: number | null) {
    this.busGroupNoSelected = selectedBusGroup;
    this.loadServiceNo(this.busGroupNoSelected);
  }

  handleSelectServiceNo(selectedServiceNo: number | null) {
    this.serviceNoSelected = selectedServiceNo;
    this.loadSVTPayload(this.serviceNoSelected);
  }
}
