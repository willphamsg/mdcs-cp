import { CommonModule, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
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
import { IMessageDataFile } from '@app/models/parameter-management';
import { MessageDataImportExportService } from '@app/services/message-data-import-export.service';
import { PaginationService } from '@app/services/pagination.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import {
  combineLatest,
  Subject,
  takeUntil,
  Subscription,
} from 'rxjs';
import { ViewComponent } from './view/view.component';
import { FilterService } from '@app/services/filter.service';
import { DepoService } from '@app/services/depo.service';
import { MatSortModule, Sort } from '@angular/material/sort';
import MessageData from '@data/message-data-import.json';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';
import { AppStore } from '@app/store/app.state';
import { Store } from '@ngrx/store';
import { AppConfigService } from '@app/services/app-config.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { provideNativeDateAdapter } from '@angular/material/core';
import { AuthService } from '@app/services/auth.service';

import { WebSocketService, WS_TOPICS } from '@app/services/web-socket.service';

@Component({
  selector: 'app-message-data-import',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSortModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatTableModule,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    RouterModule,
    BreadcrumbsComponent,
    PaginationComponent,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './message-data-import.component.html',
  styleUrl: './message-data-import.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageDataImportComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private pollingSubscription?: Subscription;
  isDagw = this.authService.isDagw();
  paginatedData: any[] = [];
  titleCase = new TitleCasePipe();
  dataSource: IMessageDataFile[] = [];
  rowCount: number = 0;
  headerData = MessageData;
  displayedColumns: string[] = MessageData.map((x: IHeader) => {
    return x.field;
  });

  depots: IDepoList[] = [];
  filterConfigs: IFilterConfig[] = [];
  groupIdentifier: string = '';

  importStatus: DropdownList[] = [
    {
      id: 'Imported',
      value: 'Imported',
    },
    {
      id: 'Fail',
      value: 'Fail',
    },
  ];

  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      depot_id: [],
    },
  };

  // dateSelected: string = '';

  constructor(
    private readonly importExportService: MessageDataImportExportService,
    private readonly cdr: ChangeDetectorRef,
    private readonly depoService: DepoService,
    private readonly filterService: FilterService,
    private readonly store: Store<AppStore>,
    private readonly paginationService: PaginationService,
    public readonly dialog: MatDialog,
    private readonly configService: AppConfigService,
    private readonly authService: AuthService,
    private readonly webSocketService: WebSocketService
  ) {}

  ngOnInit() {
    if (this.isDagw) {
      this.params.search_select_filter = {
        ...this.params.search_select_filter,
        depot_id: [this.configService.getConfig('DAGW_DEPOT')],
      };
    }
    this.subscribeToDepoChanges();
    this.loadFilterValues();
  }

  ngOnDestroy() {
    this.stopPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }

  subscribeToDepoChanges(): void {
    const depotList$ = this.depoService.depoList$;
    const searchValue$ = this.filterService.searchValue$;
    const filterValues$ = this.filterService.filterValues$;

    combineLatest([depotList$, searchValue$, filterValues$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([, searchValue, filterValue]) => {
        this.params.search_text = searchValue;

        if (filterValue) {
          // Handle filter values if needed
        }

        this.params.search_select_filter = {
          ...this.params.search_select_filter,
        };
        this.reloadHandler();
      });
  }

  loadFilterValues(): void {
    this.filterConfigs = [];
  }

  reloadHandler() {
    if (this.groupIdentifier) {
      this.searchByGroupId(this.groupIdentifier);
    } else if (this.depots) {
      this.importExportService.manage(this.params, 'import').subscribe({
        next: value => {
          if (value.status === 200) {
            this.updateDataSource(value.payload);
            this.cdr.detectChanges();
          }
        },
      });
    }
  }

  searchByGroupId(grpIdentifier: string) {
    this.importExportService.searchImportByGroupId(grpIdentifier).subscribe({
      next: (response: PayloadResponse) => {
        if (response.status === 200) {
          this.updateDataSource(response.payload);
          this.cdr.detectChanges();

          // Check if all items are complete and stop polling if needed
          if (this.areAllItemsComplete()) {
            this.stopPolling();
          }
        }
      },
      error: error => {
        console.error('Search by group ID failed:', error);
        this.store.dispatch(
          showSnackbar({
            message: 'Failed to search imported data',
            title: 'Error',
            typeSnackbar: 'error',
          })
        );
      },
    });
  }

  private areAllItemsComplete(): boolean {
    if (!this.dataSource || this.dataSource.length === 0) {
      return false;
    }

    return this.dataSource.every(
      item => item.status === 'Imported' || item.status === 'Fail'
    );
  }

  private startPolling(): void {
    this.stopPolling();

    this.pollingSubscription = this.webSocketService
      .refreshTrigger(WS_TOPICS.messageDataImport, 5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.groupIdentifier) {
          this.searchByGroupId(this.groupIdentifier);
        }
      });
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
  }

  updateDataSource(payload: any): void {
    this.rowCount = payload['records_count'];
    this.dataSource = payload['message_data_import'].map(
      this.mapBusList.bind(this)
    );
  }

  mapBusList(item: any) {
    return {
      ...item,
      status: this.titleCase.transform(item.status),
      depot:
        this.depots.find(x => x.depot_id == item.depot_id)?.depot_name || '',
    };
  }

  sortHandler(element: Sort) {
    this.params.sort_order = [
      { name: element.active, desc: element.direction != 'asc' },
    ];
    this.reloadHandler();
  }

  openView() {
    const dialogRef = this.dialog.open(ViewComponent, {
      width: '90%',
      height: '70%',
      disableClose: true,
      data: { title: 'Import Message Data' },
    });

    dialogRef.afterClosed().subscribe(bhv => {
      if (bhv === 'cancel') {
        return;
      }
      this.reloadHandler();
    });
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

  importHandler(event: any) {
    if (event.target.files.length) {
      const fileList = event.target.files;
      const formData = new FormData();
      // const date =
      //   new DatePipe('en-US').transform(
      //     this.dateSelected,
      //     "yyyy-MM-dd'T'00:00:00"
      //   ) ?? '';
      for (const file of Array.from(fileList)) {
        formData.append('file', file);
      }
      // formData.append('date_selected', date);

      this.importExportService.import(formData).subscribe({
        next: (response: PayloadResponse) => {
          if (response.status === 200) {
            this.groupIdentifier = response.payload.grp_identifier;

            this.store.dispatch(
              showSnackbar({
                message: response.message || 'File uploaded successfully',
                title: 'Success',
                typeSnackbar: 'success',
              })
            );

            this.searchByGroupId(this.groupIdentifier);
            this.startPolling(); // Start polling after successful upload
          }
        },
        error: error => {
          console.error('Upload failed:', error);
          this.store.dispatch(
            showSnackbar({
              message: 'File upload failed',
              title: 'Error',
              typeSnackbar: 'error',
            })
          );
        },
      });
    }
  }
}
