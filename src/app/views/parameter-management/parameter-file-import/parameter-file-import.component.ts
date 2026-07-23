import { CommonModule, TitleCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
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
import { IFile } from '@app/models/parameter-management';
import { FileImportExportService } from '@app/services/file-import-export.service';
import { PaginationService } from '@app/services/pagination.service';
import { IFilterConfig } from '@app/shared/utils/form-utils';
import {
  combineLatest,
  Subject,
  Subscription,
  takeUntil,
} from 'rxjs';
import { ViewComponent } from './view/view.component';
import { FilterService } from '@app/services/filter.service';
import { DepoService } from '@app/services/depo.service';
import { MatSortModule, Sort } from '@angular/material/sort';
import ParameterFile from '@data/parameter-file-import.json';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';
import { AppStore } from '@app/store/app.state';
import { Store } from '@ngrx/store';
import { CommonService } from '@app/services/common.service';
import { AuthService } from '@app/services/auth.service';
import { FileImportConfirmationDialogComponent } from './file-import-confirmation-dialog.component';
import { ImportFailedDialogComponent } from './import-failed-dialog.component';
import { ParameterService } from '@app/services/parameter.service';
import { WebSocketService, WS_TOPICS } from '@app/services/web-socket.service';

@Component({
  selector: 'app-parameter-file-import',
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
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDividerModule,
    MatTableModule,
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    RouterModule,
    BreadcrumbsComponent,
    // FilterComponent,
    PaginationComponent,
    // SelectedFilterComponent,
  ],
  templateUrl: './parameter-file-import.component.html',
  styleUrl: './parameter-file-import.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParameterFileImportComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly destroy$ = new Subject<void>();
  private statusPollingSub?: Subscription;
  private depoChangesSub?: Subscription;
  paginatedData: any[] = [];
  titleCase = new TitleCasePipe();
  dataSource: IFile[] = [];
  rowCount: number = 0;
  currentPage: number = 1;

  // Helper method to get a fresh empty array reference
  // This ensures change detection always works when showing empty table
  private getEmptyDataSource(): IFile[] {
    return [];
  }
  grpIdentifierIds: string[] = [];
  private readonly grpIdentifierIdsByDepot = new Map<number, string[]>();

  headerData = ParameterFile;
  displayedColumns: string[] = ParameterFile.map((x: IHeader) => {
    return x.field;
  });

  depots: IDepoList[] = [];
  depotSelected?: number;
  filterConfigs: IFilterConfig[] = [];

  // Mapping from frontend column names to backend sort field names
  private readonly sortFieldMapping: { [key: string]: string } = {
    file_id: 'parameter_file_id',
    param_filename: 'parameter_file_name',
    param_version: 'parameter_file_version',
    status: 'export_status',
    type: 'type',
    description: 'description',
  };

  importStatus: DropdownList[] = [
    {
      id: 'Importing',
      value: 'Importing',
    },
    {
      id: 'Success',
      value: 'Success',
    },
    {
      id: 'Failed',
      value: 'Failed',
    },
  ];

  params: IParams = {
    page_size: 10,
    page_index: 0,
    sort_order: [],
    search_text: '',
    search_select_filter: {
      current_depot: [],
      mdcs_access: [],
      grp_identifier_id: [],
    },
  };

  constructor(
    private readonly importExportService: FileImportExportService,
    private readonly parameterService: ParameterService,
    private readonly cdr: ChangeDetectorRef,
    private readonly depoService: DepoService,
    private readonly filterService: FilterService,
    private readonly store: Store<AppStore>,
    private readonly paginationService: PaginationService,
    public readonly dialog: MatDialog,
    private readonly commonService: CommonService,
    public readonly authService: AuthService,
    private readonly webSocketService: WebSocketService
  ) {}

  ngOnInit() {
    this.subscribeToDepoChanges();
    this.loadFilterValues();
  }

  ngOnDestroy() {
    this.stopStatusPolling();
    if (this.depoChangesSub && !this.depoChangesSub.closed) {
      this.depoChangesSub.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDepotSelected(_event?: any): void {
    // Stop any ongoing status polling
    this.stopStatusPolling();
    // Reset grp_identifier_id when depot changes
    this.loadCachedGrpIdentifierIdsForCurrentDepot();

    // Reset page when depot changes
    this.paginationService.currentPage = 1;
    this.params.page_index = 0;
    this.currentPage = 1;

    // Use fresh empty array to show empty table
    // This ensures mat-table always shows empty state when depot changes
    this.dataSource = this.getEmptyDataSource();
    this.rowCount = 0;

    // Force immediate UI update to show empty table
    this.cdr.detectChanges();

    // Update params with new depot and reset grp_identifier_id filter
    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      current_depot: this.depotSelected ? [this.depotSelected] : [],
      grp_identifier_id: this.grpIdentifierIds,
    };

    // Mark for check to ensure OnPush change detection picks up the changes
    // This is better than detectChanges() for OnPush strategy
    this.cdr.markForCheck();

    // Use setTimeout to ensure UI clears before reloading
    // This gives Angular's change detection cycle time to update the view
    setTimeout(() => {
      this.reloadHandler();
    }, 0);
  }

  subscribeToDepoChanges(): void {
    // Unsubscribe from previous subscription if it exists
    if (this.depoChangesSub && !this.depoChangesSub.closed) {
      this.depoChangesSub.unsubscribe();
    }

    const depotList$ = this.depoService.depoList$;
    const searchValue$ = this.filterService.searchValue$;
    const filterValues$ = this.filterService.filterValues$;

    this.depoChangesSub = combineLatest([
      depotList$,
      searchValue$,
      filterValues$,
    ])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([depotList, searchValue, filterValue]) => {
        this.params.search_text = searchValue;
        this.depots = depotList;

        const { mdcsAccess = [] } = {
          mdcsAccess: filterValue?.['mdcsAccess'],
        };

        this.params.search_select_filter = {
          ...this.params.search_select_filter,
          current_depot: this.depotSelected ? [this.depotSelected] : [],
          mdcs_access: mdcsAccess,
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
        controlName: 'depots',
        value: [],
        type: 'array',
        options: this.depots,
      },
      {
        controlName: 'mdcsAccess',
        value: [],
        type: 'array',
        options: this.importStatus,
      },
    ];
  }

  reloadHandler() {
    // Only call API if a depot is selected
    if (!this.depotSelected) {
      // Use fresh empty array when no depot is selected
      this.dataSource = this.getEmptyDataSource();
      this.rowCount = 0;
      this.stopStatusPolling();
      this.cdr.markForCheck();
      return;
    }

    if (this.depots) {
      this.importExportService
        .manage(this.params, 'import')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: value => {
            if (value.status === 200) {
              this.updateDataSource(value.payload);
              this.checkAndStartPolling();
              // Force change detection to ensure mat-table updates
              // Use detectChanges() to immediately update the view
              this.cdr.detectChanges();
            }
          },
        });
    }
  }

  updateDataSource(payload: any): void {
    this.rowCount = payload['records_count'] || 0;
    const parameterFileData = payload['parameter_file_data'] || [];

    // // Extract unique grp_identifier_id values from the response
    // const grpIdentifierIds = parameterFileData
    //   .map((file: any) => file?.grp_identifier_id)
    //   .filter((id: string) => id != null && id !== '') as string[];

    // // Always update grp_identifier_id values based on API response
    // // This ensures stale data from previous depot is cleared when switching depots
    // this.grpIdentifierIds = [...new Set(grpIdentifierIds)];

    // // Update params to reflect the new grp_identifier_id values
    // this.params.search_select_filter = {
    //   ...this.params.search_select_filter,
    //   grp_identifier_id: this.grpIdentifierIds,
    // };

    // Always create a NEW array reference to ensure mat-table detects the change
    if (parameterFileData.length > 0) {
      // When we have data, create a new array with mapped data
      this.dataSource = [...parameterFileData.map(this.mapBusList.bind(this))];
    } else {
      // When API returns empty data, use fresh empty array
      // This ensures the table always shows empty state correctly
      this.dataSource = this.getEmptyDataSource();
    }
  }

  mapBusList(item: any) {
    return {
      ...item,
      status: this.mapStatusFromBE(item.status),
      description: item.description || '', // Add description field
    };
  }

  private mapStatusFromBE(beStatus: string): string {
    // Normalize status to lowercase for comparison
    const normalizedStatus = beStatus?.toLowerCase() || '';

    // Map BE status to FE status according to requirements:
    // New + Pending(BE) → Importing (FE)
    // Success(BE) → Success (FE)
    // Failed (BE) → Failed (FE)
    // Cancelled(BE) → '-' (FE)
    switch (normalizedStatus) {
      case 'new':
      case 'pending':
        return 'Importing';
      case 'success':
        return 'Success';
      case 'failed':
      case 'fail': // Support legacy 'Fail' status
        return 'Failed';
      case 'cancelled':
        return 'Cancelled by System';
      default:
        // Fallback to title case for any unmapped statuses
        return this.titleCase.transform(beStatus);
    }
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
        desc: element.direction !== 'asc',
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
    return this.headerData.find(x => x.field == element)!.chk;
  }

  openView() {
    const dialogRef = this.dialog.open(ViewComponent, {
      width: '90%',
      height: '70%',
      disableClose: true,
      data: { title: 'Import Parameter' },
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
    // Clear grp_identifier_id when filters are reset
    this.grpIdentifierIds = [];
    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      grp_identifier_id: [],
    };
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

  importHandler(event: Event) {
    const input = event.target as HTMLInputElement;
    const fileList = input.files;

    if (!fileList || fileList.length === 0) {
      return;
    }

    const files = Array.from(fileList);

    const hasInvalidFile = files.some(
      file => !file.name.toLowerCase().endsWith('.zip')
    );

    if (hasInvalidFile) {
      this.store.dispatch(
        showSnackbar({
          message: 'Only ZIP file is allowed.',
          title: 'Invalid File',
          typeSnackbar: 'error',
        })
      );

      if (this.fileInputRef?.nativeElement) {
        this.fileInputRef.nativeElement.value = '';
      }

      return;
    }

    const dialogRef = this.dialog.open(FileImportConfirmationDialogComponent, {
      width: '576px',
      height: '244px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        const formData = new FormData();

        for (const file of Array.from(fileList)) {
          formData.append('file', file);
        }

        this.importExportService
          .import(formData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (value: PayloadResponse) => {
              if (value.status == 201) {
                const paramImportFiles =
                  value.payload?.['param_import_files'] || [];

                const grpIdentifierIds = paramImportFiles
                  .map((file: any) => file?.grp_identifier_id)
                  .filter((id: string) => id != null && id !== '') as string[];

                if (grpIdentifierIds.length > 0) {
                  this.addGrpIdentifierIdsForCurrentDepot(grpIdentifierIds);
                }

                this.store.dispatch(
                  showSnackbar({
                    message: value.message,
                    title: 'Success',
                    typeSnackbar: 'success',
                  })
                );

                if (this.fileInputRef?.nativeElement) {
                  this.fileInputRef.nativeElement.value = '';
                }

                this.paginationService.currentPage = 1;
                this.params.page_index = 0;
                this.currentPage = 1;

                this.startStatusPolling();
                this.reloadHandler();
              }
            },
          });
      } else if (this.fileInputRef?.nativeElement) {
        this.fileInputRef.nativeElement.value = '';
      }
    });
  }

  private checkAndStartPolling(): void {
    // Check if there are any items with "Importing" status
    const hasImportingItems = this.dataSource.some(
      item => item.status === 'Importing'
    );

    // Check if any item has Cancelled status (mapped to '-')
    const hasCancelledItems = this.dataSource.some(item => item.status === '-');

    // If there are cancelled items, stop polling
    if (hasCancelledItems) {
      this.clearGrpIdentifierIdsForCurrentDepot();

      // Only show failed dialog if we were actively polling (not on initial load)
      const wasPolling = this.statusPollingSub && !this.statusPollingSub.closed;
      this.stopStatusPolling();
      if (wasPolling) {
        this.showImportFailedDialog();
      }
      return;
    }

    // If there are importing items, start polling
    if (hasImportingItems) {
      this.startStatusPolling();
    } else {
      // All items are in final states (Success or Failed), stop polling
      this.stopStatusPolling();
    }
  }

  private startStatusPolling(): void {
    if (this.statusPollingSub && !this.statusPollingSub.closed) {
      return;
    }

    if (!this.depotSelected) {
      return;
    }

    this.statusPollingSub = this.webSocketService
      .refreshTrigger(WS_TOPICS.parameterFileImport, 3000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.reloadHandler();
      });
  }

  private stopStatusPolling(): void {
    if (this.statusPollingSub && !this.statusPollingSub.closed) {
      this.statusPollingSub.unsubscribe();
    }
    this.statusPollingSub = undefined;
  }

  private showImportFailedDialog(): void {
    const dialogRef = this.dialog.open(ImportFailedDialogComponent, {
      disableClose: true,
      width: '576px',
      height: '292px',
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.reloadHandler();
      });
  }

  private getSelectedDepotId(): number | undefined {
    return this.depotSelected ? Number(this.depotSelected) : undefined;
  }

  private setActiveGrpIdentifierIds(ids: string[]): void {
    const uniqueIds = [...new Set(ids)];

    this.grpIdentifierIds = uniqueIds;

    this.params.search_select_filter = {
      ...this.params.search_select_filter,
      grp_identifier_id: uniqueIds,
    };
  }

  private loadCachedGrpIdentifierIdsForCurrentDepot(): void {
    const depotId = this.getSelectedDepotId();

    if (!depotId) {
      this.setActiveGrpIdentifierIds([]);
      return;
    }

    const cachedIds = this.grpIdentifierIdsByDepot.get(depotId) ?? [];
    this.setActiveGrpIdentifierIds(cachedIds);
  }

  private addGrpIdentifierIdsForCurrentDepot(ids: string[]): void {
    const depotId = this.getSelectedDepotId();

    if (!depotId || ids.length === 0) {
      return;
    }

    const existingIds = this.grpIdentifierIdsByDepot.get(depotId) ?? [];
    const updatedIds = [...new Set([...existingIds, ...ids])];

    this.grpIdentifierIdsByDepot.set(depotId, updatedIds);
    this.setActiveGrpIdentifierIds(updatedIds);
  }

  private clearGrpIdentifierIdsForCurrentDepot(): void {
    const depotId = this.getSelectedDepotId();

    if (depotId) {
      this.grpIdentifierIdsByDepot.delete(depotId);
    }

    this.setActiveGrpIdentifierIds([]);
  }
}
