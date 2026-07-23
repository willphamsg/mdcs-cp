import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { FilterComponent } from '@app/components/filter/filter.component';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { BreadcrumbsComponent } from '@app/components/layout/breadcrumbs/breadcrumbs.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import {
  DropdownList,
  IHeader,
  IPaginationEvent,
  IParams,
  PayloadResponse,
} from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { IParameterFileExportEntity } from '@app/models/parameter-management';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { DepoService } from '@app/services/depo.service';
import { FileImportExportService } from '@app/services/file-import-export.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import ParameterFile from '@data/parameter-file-export.json';
import {
  combineLatest,
  Subject,
  Subscription,
  take,
  takeUntil,
} from 'rxjs';
import { MessageService } from '@app/services/message.service';
import { ExportCancelDownloadDialogComponent } from './export-cancel-download-dialog.component';
import { ExportDownloadFailedDialogComponent } from './export-download-failed-dialog.component';
import { WebSocketService, WS_TOPICS } from '@app/services/web-socket.service';
@Component({
  selector: 'app-parameter-file-export',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatDividerModule,
    MatTableModule,
    MatSortModule,
    FormsModule,
    BreadcrumbsComponent,
    FilterComponent,
    PaginationComponent,
    SelectedFilterComponent,
  ],
  templateUrl: './parameter-file-export.component.html',
  styleUrl: './parameter-file-export.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParameterFileExportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private statusPollingSub?: Subscription;
  paginatedData: any[] = [];
  dataSource: (IParameterFileExportEntity & {
    depot?: string;
    chk?: boolean;
    isLoading?: boolean;
  })[] = [];

  headerData = ParameterFile;
  displayedColumns: string[] = ParameterFile.filter((x: IHeader) => x.chk).map(
    (x: IHeader) => {
      return x.field;
    }
  );

  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      depot_id: [],
      param_type: [],
      grp_identifier_id: [],
    },
  };

  selection: IParameterFileExportEntity[] = [];
  storedExportData: IParameterFileExportEntity[] = [];
  grpIdentifierIds: string[] = [];

  // Mapping from frontend column names to backend sort field names
  private readonly sortFieldMapping: { [key: string]: string } = {
    param_file_id: 'param_file_id',
    param_file_name: 'param_file_name',
    param_payload_version: 'param_payload_version',
    param_type: 'param_type',
    status: 'status',
    description: 'description',
  };

  isParameterReadDialogShown = false;

  depotSelected: number;
  depots: IDepoList[] = [];
  chkAll: boolean = false;
  filterConfigs: IFilterConfig[] = [];
  rowCount: number = 0;
  currentPage: number = 1;
  typeOptions: DropdownList[] = [
    { id: 'Live', value: 'Live' },
    { id: 'Trial', value: 'Trial' },
  ];

  get isExportDisabled(): boolean {
    const stored = localStorage.getItem('param_file_export_data');
    const hasStoredData = !!stored && stored !== '[]';
    return hasStoredData;
  }

  constructor(
    private importExportService: FileImportExportService,
    private filterService: FilterService,
    private paginationService: PaginationService,
    private depoService: DepoService,
    private cdr: ChangeDetectorRef,
    public dialog: MatDialog,
    private commonService: CommonService,
    public authService: AuthService,
    private message: MessageService,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit() {
    this.storedExportData = JSON.parse(
      localStorage.getItem('param_file_export_data')!
    ) as IParameterFileExportEntity[];
    this.checkLocalStorage();
    this.intervalStatus();

    this.subscribeToDepoChanges();
    this.loadFilterValues();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onDepotSelected(): void {
    this.paginationService.currentPage = 1;
    this.params.page_index = 0;
    this.currentPage = 1;

    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      depot_id: this.depotSelected ? [this.depotSelected] : [],
      grp_identifier_id: this.grpIdentifierIds,
    };

    this.reloadHandler();
  }

  checkLocalStorage(): void {
    if (
      Array.isArray(this.storedExportData) &&
      this.storedExportData.length > 0
    ) {
      this.depotSelected = this.storedExportData[0].param_depot_id;

      const noStatusParam = this.storedExportData.map(obj => {
        const clone = { ...obj };
        delete clone.status;
        return clone;
      });

      const param_file_export_data = {
        param_file_export_data: noStatusParam,
      };

      this.importExportService
        .exportStatus(param_file_export_data)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (value: PayloadResponse) => {
            if (value.status == 200) {
              const exportEntities: IParameterFileExportEntity[] =
                value.payload['param_file_export_entity_pgn'];

              if (this.containsCancelledStatus(exportEntities)) {
                this.storedExportData = exportEntities;
                this.saveStoredExportData();

                this.stopStatusPolling();
                this.showDownloadFailedDialog();
                return;
              }

              this.storedExportData = exportEntities;
              this.saveStoredExportData();
              this.refreshCurrentTableStatus();
              this.tryOpenExportReadyDialog();
            }
          },
        });
    }
  }

  intervalStatus(): void {
    if (
      !(
        Array.isArray(this.storedExportData) &&
        this.storedExportData.length > 0
      )
    ) {
      this.stopStatusPolling();
      return;
    }

    if (this.statusPollingSub && !this.statusPollingSub.closed) {
      return;
    }

    this.statusPollingSub = this.webSocketService
      .refreshTrigger(WS_TOPICS.parameterFileExport, 3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.checkLocalStorage();
      });
  }

  parameterReady(): void {
    this.stopStatusPolling();
    this.isParameterReadDialogShown = true;
    const dialogRef = this.message.openExportStatusDialog(
      'Export Files Ready',
      this.storedExportData
    );
    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: 'confirm' | undefined) => {
        if (result === 'confirm') {
          this.downloadZip();
        } else if (result === 'cancel') {
          // Handle cancel action if needed
        }
      });
  }

  downloadZip(): void {
    const noStatusParam = this.storedExportData.map(obj => {
      const clone = { ...obj };
      delete clone.status;
      return clone;
    });

    const param_file_export_data = {
      param_file_export_data: noStatusParam,
      depot_id: noStatusParam[0].param_depot_id,
      service_provider_id: noStatusParam[0].serviceProviderId,
    };

    this.importExportService
      .export(param_file_export_data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { blob: Blob; filename: string }) => {
          // Use filename from response, or generate one as fallback
          let filename = response.filename;

          // If no filename from server, generate one
          if (!filename || filename === 'parameter-export.zip') {
            const firstFileName =
              this.storedExportData[0]?.param_file_name || 'parameter-export';
            const depotId = noStatusParam[0].param_depot_id;
            const timestamp = new Date()
              .toISOString()
              .replace(/[:.]/g, '-')
              .slice(0, -5);
            filename = `${firstFileName}_depot${depotId}_${timestamp}.zip`;
          }

          // Create download link and trigger download
          const url = window.URL.createObjectURL(response.blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          console.log('File downloaded successfully:', filename);

          // Clean up after successful download
          this.cleanupAfterDownload();
        },
        error: (err: Error) => {
          console.error('Download failed:', err);
          this.showDownloadFailedDialog();
        },
      });
  }

  /*
  Only call this.destroy$ after API call is completed. Calling this prematurely will cancel the API call.
  */
  private cleanupAfterDownload(): void {
    this.stopStatusPolling();

    localStorage.removeItem('param_file_export_data');
    this.storedExportData = [];
    this.grpIdentifierIds = [];
    this.isParameterReadDialogShown = false;
    this.selection = [];
    this.chkAll = false;

    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      grp_identifier_id: [],
    };

    this.checkLocalStorage();
    this.reloadHandler();
    this.cdr.markForCheck();
  }

  subscribeToDepoChanges(): void {
    const depotList$ = this.depoService.depoList$;
    const searchValue$ = this.filterService.searchValue$;
    const filterValues$ = this.filterService.filterValues$;

    combineLatest([depotList$, searchValue$, filterValues$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([depotList, searchValue, filterValue]) => {
        this.params.search_text = searchValue;
        this.depots = depotList;

        let depots = filterValue?.['depots'] ?? [];
        if (!Array.isArray(depots) || depots.length === 0) {
          depots = this.commonService.getDepotIds(depotList);
        }

        const paramTypes = filterValue?.['param_type'] ?? [];

        this.params.search_select_filter = {
          ...this.params.search_select_filter,
          depot_id: this.depotSelected ? [this.depotSelected] : depots,
          param_type: Array.isArray(paramTypes) ? paramTypes : [],
          grp_identifier_id: this.grpIdentifierIds,
        };

        // Reset page when new filter/search happens
        this.paginationService.currentPage = 1;
        this.params.page_index = 0;
        this.currentPage = 1;

        this.reloadHandler();
      });
  }

  loadFilterValues(): void {
    this.filterConfigs = [
      {
        controlName: 'param_type',
        value: [],
        type: 'array',
        options: this.typeOptions,
      },
    ];
  }

  reloadHandler() {
    if (this.depots && this.depotSelected) {
      this.importExportService
        .manage(this.params, 'export')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: value => {
            if (value.status === 200) {
              this.updateDataSource(value.payload);
              this.cdr.markForCheck();
            }
          },
        });
    }
  }

  updateDataSource(payload: any): void {
    const exportRows: IParameterFileExportEntity[] =
      payload['param_file_export_entity_pgn'] ?? [];

    this.rowCount = payload['records_count'];

    let storedChanged = false;

    this.dataSource = exportRows.map((item: IParameterFileExportEntity) => {
      const mapped = this.mapData(item);

      const matchedStored = this.storedExportData?.find(x =>
        this.isSameExportItem(x, item)
      );

      const apiStatus = item.status;
      const storedStatus = matchedStored?.status;

      // Important:
      // If API already says success/failed, trust API final status.
      // Do not let old local PENDING overwrite success.
      const finalStatus = this.isFinalStatus(apiStatus)
        ? apiStatus
        : storedStatus ?? apiStatus;

      if (matchedStored && this.isFinalStatus(apiStatus)) {
        Object.assign(matchedStored, {
          ...matchedStored,
          ...item,
          status: apiStatus,
        });
        storedChanged = true;
      }

      return {
        ...mapped,
        status: finalStatus,
        isLoading: this.isPendingStatus(finalStatus),
      };
    });

    if (storedChanged) {
      this.saveStoredExportData();
    }
    this.tryOpenExportReadyDialog();

    this.dataSource.forEach(item => {
      item.chk = this.selection.some(sel =>
        this.isSameExportItem(sel, item)
      );
    });

    if (this.selection.length > 0) {
      this.sortSelectedItemsToTop();
    }

    this.updateCheckAllState();
    this.cdr.markForCheck();
  }

  mapData(item: any) {
    return {
      ...item,
      depot:
        this.depots.find(x => x.depot_id === item.param_depot_id)?.depot_name ||
        '',
    };
  }

  sortHandler(element: Sort) {
    if (!element.active || element.direction === '') {
      // Reset sort order when sorting is cleared
      this.params.sort_order = [];
      // Reset to page 1 when clearing sort
      this.paginationService.currentPage = 1;
      this.params.page_index = 0;
      this.currentPage = 1;
      this.reloadHandler();
      return;
    }

    // Map frontend column name to backend sort field name
    const backendFieldName =
      this.sortFieldMapping[element.active] || element.active;

    // Update sort order parameters for server-side sorting
    this.params.sort_order = [
      {
        name: backendFieldName,
        desc: element.direction === 'asc' ? false : true,
      },
    ];

    // Reset to page 1 when sort changes
    this.paginationService.currentPage = 1;
    this.params.page_index = 0;
    this.currentPage = 1;

    // Reload data from API with sort parameters
    this.reloadHandler();
  }

  hiddenHandler(element: string) {
    return this.headerData.filter(x => x.field == element)[0].chk;
  }

  export() {
    this.isParameterReadDialogShown = false;

    const param_file_export_data = this.selection.map(item => ({
      serviceProviderId: item.serviceProviderId,
      param_depot_id: item.param_depot_id,
      param_file_id: item.param_file_id,
      param_file_name: item.param_file_name,
      param_payload_version: item.param_payload_version,
      param_type: item.param_type,
      status: null,
    }));

    // Store to localStorage for checking the status if its ready for download
    localStorage.setItem(
      'param_file_export_data',
      JSON.stringify(param_file_export_data)
    );

    // Sort selected items to the top (UI only)
    this.sortSelectedItemsToTop();

    const obj = {
      param_file_export_data,
    };

    this.importExportService
      .exportFileRequest(obj)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (value: PayloadResponse) => {
          if (value.status == 200) {
            // Extract grp_identifier_id from param_export_files
            const paramExportFiles =
              value.payload?.['param_export_files'] || [];
            const grpIdentifierIds = paramExportFiles
              .map((file: any) => file?.grp_identifier_id)
              .filter((id: string) => id != null && id !== '') as string[];

            // Store unique grp_identifier_id values
            this.grpIdentifierIds = [...new Set(grpIdentifierIds)];

            // Update search filter with grp_identifier_id
            this.params.search_select_filter = {
              ...this.params.search_select_filter,
              grp_identifier_id: this.grpIdentifierIds,
            };

            // Try to get export entities from param_file_export_entity_pgn (fallback)
            const exportEntities: IParameterFileExportEntity[] =
              value.payload?.['param_file_export_entity_pgn'] ||
              paramExportFiles.map((file: any) => ({
                serviceProviderId: file.serviceProviderId,
                param_depot_id: file.param_depot_id,
                param_file_id: file.param_file_id || '',
                param_file_name: file.param_file_name,
                param_payload_version: file.param_payload_version,
                param_type: file.param_type || '',
                description: file.description,
                status: file.status,
              }));

            if (this.containsCancelledStatus(exportEntities)) {
              this.storedExportData = exportEntities;
              this.stopStatusPolling();
              this.showDownloadFailedDialog();
              return;
            }

            this.storedExportData = JSON.parse(
              localStorage.getItem('param_file_export_data')!
            ) as IParameterFileExportEntity[];
            this.checkLocalStorage();
            this.intervalStatus();

            this.reloadHandler();
            console.log(this.storedExportData);
          }
        },
      });
  }

  cancel(): void {
    this.stopStatusPolling();

    localStorage.removeItem('param_file_export_data');
    this.storedExportData = [];
    this.grpIdentifierIds = [];
    this.isParameterReadDialogShown = false;
    this.selection = [];
    this.chkAll = false;

    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      grp_identifier_id: [],
    };

    this.checkLocalStorage();
    this.reloadHandler();
    this.cdr.markForCheck();
  }

  openCancelDownloadDialog(): void {
    this.dialog
      .open(ExportCancelDownloadDialogComponent, {
        disableClose: true,
        width: '576px',
        height: '268px',
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe(result => {
        if (result) {
          this.cancel();
        }
      });
  }

  private showDownloadFailedDialog(): void {
    const dialogRef = this.dialog.open(ExportDownloadFailedDialogComponent, {
      disableClose: true,
      width: '576px',
      height: '292px',
    });

    dialogRef
      .afterClosed()
      .pipe(take(1))
      .subscribe(() => {
        this.cleanupAfterDownload();
      });
  }

  onTabChange() {
    this.filterService.clearSelectedFilters();
    this.reloadHandler();
  }

  onPageChange(event: IPaginationEvent): void {
    this.currentPage = event.page;
    this.paginationService.handlePageEvent(
      this.params,
      event,
      this.reloadHandler.bind(this)
    );
  }

  checkHandler(
    event: MatCheckboxChange,
    element: IParameterFileExportEntity & {
      depot?: string;
      chk?: boolean;
      isLoading?: boolean;
    }
  ) {
    element.chk = event.checked;

    this.selection = event.checked
      ? [...this.selection, element]
      : this.selection.filter(
          x =>
            !(
              x.param_file_name === element.param_file_name &&
              x.param_payload_version === element.param_payload_version &&
              x.param_depot_id === element.param_depot_id
            )
        );

    // Update "select all" checkbox state
    this.updateCheckAllState();
  }

  checkAllHandler(event: MatCheckboxChange): void {
    this.chkAll = event.checked;
    this.dataSource.forEach(x => (x.chk = event.checked));

    if (event.checked) {
      // Add all items from current page that aren't already in selection
      const newItems = this.dataSource.filter(
        item =>
          !this.selection.some(
            sel =>
              sel.param_file_id === item.param_file_id &&
              sel.param_payload_version === item.param_payload_version &&
              sel.param_depot_id === item.param_depot_id
          )
      );
      this.selection = [...this.selection, ...newItems];
    } else {
      // Remove only items from current page
      this.selection = this.selection.filter(
        sel =>
          !this.dataSource.some(
            item =>
              item.param_file_id === sel.param_file_id &&
              item.param_payload_version === sel.param_payload_version &&
              item.param_depot_id === sel.param_depot_id
          )
      );
    }
  }

  private updateCheckAllState(): void {
    const totalItems = this.dataSource.length;
    const selectedItemsOnCurrentPage = this.dataSource.filter(item =>
      this.selection.some(
        sel =>
          sel.param_file_id === item.param_file_id &&
          sel.param_payload_version === item.param_payload_version &&
          sel.param_depot_id === item.param_depot_id
      )
    ).length;

    this.chkAll = totalItems > 0 && selectedItemsOnCurrentPage === totalItems;
  }

  private normalizeStatus(status: string | undefined | null): string {
    return (status ?? '').trim().toUpperCase();
  }

  private isFinalStatus(status: string | undefined | null): boolean {
    const normalizedStatus = this.normalizeStatus(status);

    return (
      normalizedStatus === 'SUCCESS' ||
      normalizedStatus === 'SUCCEEDED' ||
      normalizedStatus === 'EXPORTED' ||
      normalizedStatus === 'FAILED' ||
      normalizedStatus === 'FAIL'
    );
  }

  private isPendingStatus(status: string | undefined | null): boolean {
    return this.normalizeStatus(status) === 'PENDING';
  }

  private isSameExportItem(
    a: IParameterFileExportEntity,
    b: IParameterFileExportEntity
  ): boolean {
    return (
      a.param_file_id === b.param_file_id &&
      a.param_payload_version === b.param_payload_version &&
      a.param_depot_id === b.param_depot_id
    );
  }

  private saveStoredExportData(): void {
    localStorage.setItem(
      'param_file_export_data',
      JSON.stringify(this.storedExportData)
    );
  }

  private refreshCurrentTableStatus(): void {
    if (!Array.isArray(this.dataSource) || !Array.isArray(this.storedExportData)) {
      return;
    }

    this.dataSource = this.dataSource.map(row => {
      const matchedStored = this.storedExportData.find(item =>
        this.isSameExportItem(item, row)
      );

      if (!matchedStored) {
        return row;
      }

      const status = matchedStored.status ?? row.status;

      return {
        ...row,
        status,
        description: matchedStored.description ?? row.description,
        isLoading: this.isPendingStatus(status),
      };
    });

    this.cdr.markForCheck();
  }

  private tryOpenExportReadyDialog(): void {
    if (
      this.isParameterReadDialogShown ||
      !Array.isArray(this.storedExportData) ||
      this.storedExportData.length === 0
    ) {
      return;
    }

    const processed = this.storedExportData.every(item =>
      this.isFinalStatus(item.status)
    );

    if (processed) {
      this.stopStatusPolling();
      this.parameterReady();
    }
  }

  getDisplayStatus(status: string | undefined): string {
    const normalizedStatus = this.normalizeStatus(status);

    if (!normalizedStatus) {
      return '-';
    }

    if (normalizedStatus === 'PENDING') {
      return 'Exporting...';
    }

    if (
      normalizedStatus === 'SUCCESS' ||
      normalizedStatus === 'SUCCEEDED' ||
      normalizedStatus === 'EXPORTED'
    ) {
      return 'Success';
    }

    if (normalizedStatus === 'FAILED' || normalizedStatus === 'FAIL') {
      return 'Failed';
    }

    if (normalizedStatus === 'CANCELLED') {
      return '-';
    }

    return status ?? '-';
  }

  getStatusClass(status: string | undefined): string {
    if (!status) {
      return '';
    }
    const normalizedStatus = this.normalizeStatus(status);
    if (normalizedStatus === 'PENDING') {
      return 'status-badge exporting';
    }
    if (normalizedStatus === 'FAILED' || normalizedStatus === 'FAIL') {
      return 'status-badge failed';
    }
    if (
      normalizedStatus === 'SUCCESS' ||
      normalizedStatus === 'EXPORTED' ||
      normalizedStatus === 'SUCCEEDED'
    ) {
      return 'status-badge success';
    }
    return '';
  }

  private containsCancelledStatus(
    exportEntities: IParameterFileExportEntity[] | undefined
  ): boolean {
    return (
      Array.isArray(exportEntities) &&
      exportEntities.some(
        entity => entity.status?.toUpperCase() === 'CANCELLED'
      )
    );
  }

  private stopStatusPolling(): void {
    if (this.statusPollingSub && !this.statusPollingSub.closed) {
      this.statusPollingSub.unsubscribe();
    }
    this.statusPollingSub = undefined;
  }

  private sortSelectedItemsToTop(): void {
    if (
      !this.dataSource ||
      this.dataSource.length === 0 ||
      this.selection.length === 0
    ) {
      return;
    }

    this.dataSource.sort((a, b) => {
      const aIsSelected = this.selection.some(
        sel =>
          sel.param_file_id === a.param_file_id &&
          sel.param_payload_version === a.param_payload_version &&
          sel.param_depot_id === a.param_depot_id
      );
      const bIsSelected = this.selection.some(
        sel =>
          sel.param_file_id === b.param_file_id &&
          sel.param_payload_version === b.param_payload_version &&
          sel.param_depot_id === b.param_depot_id
      );

      // Selected items come first
      if (aIsSelected && !bIsSelected) {
        return -1;
      }
      if (!aIsSelected && bIsSelected) {
        return 1;
      }
      // If both are selected or both are not selected, maintain original order
      return 0;
    });

    this.cdr.markForCheck();
  }
}
