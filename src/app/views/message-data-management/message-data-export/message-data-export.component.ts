import { CommonModule, DatePipe } from '@angular/common';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MatDialog,
} from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
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
import { IMessageDataExportFile } from '@app/models/message-management';
import { DepoService } from '@app/services/depo.service';
import {
  MessageDataExportProcessState,
  MessageDataImportExportService,
} from '@app/services/message-data-import-export.service';
import { FilterService } from '@app/services/filter.service';
import { PaginationService } from '@app/services/pagination.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import { DD_MM_YYYY_FORMAT } from '@app/shared/utils/date-time';
import { AppStore } from '@app/store/app.state';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';
import MessageData from '@data/message-data-export.json';
import { Store } from '@ngrx/store';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { AppConfigService } from '@app/services/app-config.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '@app/services/auth.service';
import { environment } from '@env/environment';
import { MessageExportReadyDialogComponent } from './export-ready-dialog.component';

@Component({
  selector: 'app-message-data-export',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatDividerModule,
    MatTableModule,
    MatSortModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatInputModule,
    FormsModule,
    CommonModule,
    BreadcrumbsComponent,
    PaginationComponent,
    SelectedFilterComponent,
  ],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
  ],
  templateUrl: './message-data-export.component.html',
  styleUrl: './message-data-export.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageDataExportComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private timeoutSnackbarShownForStartedAt: number | null = null;
  private dialogShownForStartedAt: number | null = null;
  isDagw = this.authService.isDagw();
  paginatedData: any[] = [];
  dataSource: IMessageDataExportFile[] = [];

  headerData = MessageData;
  displayedColumns: string[] = MessageData.map((x: IHeader) => {
    return x.field;
  });

  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      depot_id: [],
      mdcsAccess: [],
    },
  };

  importStatus: DropdownList[] = [
    {
      id: '0',
      value: 'Imported',
    },
    {
      id: '1',
      value: 'Fail',
    },
  ];

  depots: IDepoList[] = [];
  filterConfigs: IFilterConfig[] = [];
  rowCount: number = 0;
  exportStatus: DropdownList[] = [
    {
      id: '0',
      value: 'Exported',
    },
    {
      id: '1',
      value: 'Fail',
    },
  ];

  dateSelected: string = '';
  isExportInProgress = false;
  private isExportReadyDialogOpen = false;

  svcProviderID: string = this.authService.getSVCProvider() ?? '';

  constructor(
    private importExportService: MessageDataImportExportService,
    private filterService: FilterService,
    private paginationService: PaginationService,
    private depoService: DepoService,
    private cdr: ChangeDetectorRef,
    private store: Store<AppStore>,
    public dialog: MatDialog,
    private configService: AppConfigService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    if (this.isDagw) {
      this.params.search_select_filter = {
        ...this.params.search_select_filter,
        // depot_id: [this.configService.getConfig('DAGW_DEPOT')],
      };
    }
    this.subscribeToDepoChanges();
    this.loadFilterValues();
    this.subscribeToExportProcess();
    this.importExportService.resumeMessageExportPolling();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  subscribeToExportProcess(): void {
    this.importExportService.messageExportProcess$
      .pipe(takeUntil(this.destroy$))
      .subscribe((state: MessageDataExportProcessState) => {
        this.applyExportProcessState(state);
      });
  }

  private applyExportProcessState(state: MessageDataExportProcessState): void {
    this.isExportInProgress = state.isExportInProgress;

    if (state.dateSelected) {
      this.dateSelected = state.dateSelected;
    }

    if (state.payload) {
      this.updateDataSource(state.payload);
    }

    if (state.timedOut) {
      this.showExportTimeoutMessage(state.startedAt);
    }

    if (state.success && state.payload) {
      this.openExportReadyDialog(state.startedAt);
    }

    this.cdr.markForCheck();
  }

  private showExportTimeoutMessage(startedAt: number | null): void {
    if (startedAt && this.timeoutSnackbarShownForStartedAt === startedAt) {
      return;
    }

    this.timeoutSnackbarShownForStartedAt = startedAt;

    this.store.dispatch(
      showSnackbar({
        message:
          'Message data export timed out after 2 minutes. Please try again.',
        title: 'Warning',
        typeSnackbar: 'warning',
      })
    );
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

        const { mdcsAccess = [] } = filterValue || {};

        this.params.search_select_filter = {
          ...this.params.search_select_filter,
          mdcsAccess: mdcsAccess,
        };
        // this.reloadHandler();
      });
  }

  loadFilterValues(): void {
    this.filterConfigs = [
      {
        controlName: 'mdcsAccess',
        value: [],
        type: 'array',
        options: this.importStatus,
      },
    ];
  }

  reloadHandler() {
    const exportState =
      this.importExportService.getMessageExportProcessSnapshot();

    if (exportState.isExportInProgress) {
      if (exportState.payload) {
        this.updateDataSource(exportState.payload);
      }
      return;
    }

    if (this.depots) {
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
    const messageDataFileExport = payload?.['message_data_file_export'] ?? [];
    this.rowCount = payload?.['records_count'] ?? messageDataFileExport.length;

    const exportData = messageDataFileExport.map((item: any) => ({
      ...item,
      // depot_name:
      //   this.depots.find(
      //     x => x.depot_id == this.authService.getDefaultDepot().toString()
      //   )?.depot_name || '',
      message_data_filename: item.data_file_name,
    }));

    this.dataSource = exportData.map(this.mapData.bind(this));
  }

  mapData(item: any) {
    return {
      ...item,
      depot:
        this.depots.find(x => x.depot_id == item.depot_id)?.depot_name || '',
    };
  }

  sortHandler(element: Sort) {
    this.params.sort_order = [
      { name: element.active, desc: element.direction == 'asc' ? false : true },
    ];
    this.reloadHandler();
  }

  hiddenHandler(element: string) {
    return this.headerData.filter(x => x.field == element)[0].chk;
  }

  downloadHandler() {
    if (!this.dateSelected) {
      this.store.dispatch(
        showSnackbar({
          message: 'Please select a date before export.',
          title: 'Warning',
          typeSnackbar: 'warning',
        })
      );
      return;
    }

    const formattedDate =
      new DatePipe('en-US').transform(
        this.dateSelected,
        "yyyy-MM-dd'T'00:00:00"
      ) ?? '';

    this.importExportService.clearMessageExportProcessState();
    this.isExportInProgress = true;
    this.isExportReadyDialogOpen = false;
    this.cdr.markForCheck();

    this.importExportService
      .sendMessageExportRequest(formattedDate, this.svcProviderID)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (value: PayloadResponse) => {
          if (value.status !== 200) {
            this.handleExportRequestFailed(
              'Failed to create message export request.'
            );
            return;
          }

          const messageDataExport = value.payload?.['message_data_export'];
          const grpIdentifierId = messageDataExport?.['grp_identifier_id'];
          const serviceProviderId = messageDataExport?.['service_provider_id'];

          if (
            !grpIdentifierId ||
            serviceProviderId === null ||
            serviceProviderId === undefined
          ) {
            this.handleExportRequestFailed(
              'Export request created, but group identifier was not returned.'
            );
            return;
          }

          this.importExportService.startMessageExportPolling(
            formattedDate,
            grpIdentifierId,
            Number(serviceProviderId)
          );
        },
        error: error => {
          console.error('Error sending message export request:', error);
          this.handleExportRequestFailed(
            'Failed to create message export request.'
          );
        },
      });
  }

  private openExportReadyDialog(startedAt: number | null): void {
    if (startedAt && this.dialogShownForStartedAt === startedAt) {
      return;
    }

    if (this.isExportReadyDialogOpen) {
      return;
    }

    this.isExportReadyDialogOpen = true;
    this.dialogShownForStartedAt = startedAt;

    const dialogRef = this.dialog.open(MessageExportReadyDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        title: 'Export Files Ready',
        items: this.dataSource,
      },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {
        this.isExportReadyDialogOpen = false;
        this.importExportService.clearCompletedMessageExportProcessState();

        if (result === 'download') {
          this.downloadExportZip();
        }
      });
  }

  private downloadExportZip(): void {
    const requestPayload = [...this.dataSource];

    if (requestPayload.length === 0) {
      this.store.dispatch(
        showSnackbar({
          message:
            'No data available to download. Please ensure there are export records.',
          title: 'Warning',
          typeSnackbar: 'warning',
        })
      );
      return;
    }

    this.importExportService
      .export(requestPayload, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: Blob) => {
          if (response.size === 0) {
            this.store.dispatch(
              showSnackbar({
                message: 'Received empty file from server',
                title: 'Error',
                typeSnackbar: 'error',
              })
            );
            return;
          }

          this.downloadFile(response, 'All_Zips_Export.zip');
        },
        error: error => {
          console.error('=== Download Error ===', error);

          let errorMessage = 'Unknown error';
          if (error.status === 0) {
            errorMessage = 'Network error - cannot connect to server';
          } else if (error.status === 404) {
            errorMessage = 'API endpoint not found';
          } else if (error.status === 500) {
            errorMessage = 'Server internal error';
          } else if (error.message) {
            errorMessage = error.message;
          }

          this.store.dispatch(
            showSnackbar({
              message: `Failed to download export file: ${errorMessage}`,
              title: 'Error',
              typeSnackbar: 'error',
            })
          );
        },
      });
  }

  private handleExportRequestFailed(message: string): void {
    this.importExportService.clearMessageExportProcessState();
    this.isExportInProgress = false;
    this.isExportReadyDialogOpen = false;
    this.cdr.markForCheck();

    this.store.dispatch(
      showSnackbar({
        message,
        title: 'Error',
        typeSnackbar: 'error',
      })
    );
  }

  private isDummyData(): boolean {
    return environment?.useDummyData || false;
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    this.store.dispatch(
      showSnackbar({
        message: 'File downloaded successfully',
        title: 'Success',
        typeSnackbar: 'success',
      })
    );
  }

  onTabChange() {
    this.filterService.clearSelectedFilters();
    this.reloadHandler();
  }

  onPageChange(event: IPaginationEvent): void {
    this.paginationService.handlePageEvent(
      this.params,
      event,
      this.reloadHandler.bind(this)
    );
  }

  onDateChange(): void {
    if (this.isExportInProgress) {
      return;
    }

    this.isExportReadyDialogOpen = false;
    this.dataSource = [];
    this.rowCount = 0;
    this.cdr.markForCheck();
  }
}
