import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { BreadcrumbsComponent } from '@app/components/layout/breadcrumbs/breadcrumbs.component';
import { PaginationComponent } from '@app/components/pagination/pagination.component';
import { PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { IEodDates, IEodProcess } from '@app/models/maitenance';
import { FilterService } from '@app/services/filter.service';
import { MaintenanceSharedService } from '@app/services/maintenance-shared.service';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '@app/services/auth.service';
import { MatInputModule } from '@angular/material/input';
import { Router, NavigationStart } from '@angular/router';
import { EodConfirmationDialogComponent } from './eod-confirmation-dialog.component';
import { WebSocketService, WS_TOPICS } from '@app/services/web-socket.service';
@Component({
  selector: 'app-eod-process',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatDividerModule,
    MatTableModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatSortModule,
    // PaginationComponent,
    MatInputModule,
  ],
  templateUrl: './eod-process.component.html',
  styleUrls: ['./eod-process.component.scss'],
})
export class EodProcessComponent implements OnInit, OnDestroy {
  @ViewChild(MatTable) table: MatTable<any>;
  displayedColumns: string[] = [
    'id',
    'taskName',
    'description',
    'startTime',
    'endTime',
    'status',
  ];
  dataSource: IEodProcess[] = [];
  depot: IDepoList | null = null;
  depotForm: FormGroup;

  eodDates: IEodDates | undefined;
  isDisabled: boolean = true;
  isForcingEOD: boolean = false;

  params: {
    depot_id: string | '';
  };

  private destroy$ = new Subject<void>();
  private pollingSubscription: Subscription | null = null;

  constructor(
    private cdr: ChangeDetectorRef,
    private sharedService: MaintenanceSharedService,
    private filterService: FilterService,
    public authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.router.events.pipe(takeUntil(this.destroy$)).subscribe(event => {
      if (event instanceof NavigationStart) {
        this.stopPolling();
      }
    });

    this.sharedService.selectedDepot$.subscribe(depot => {
      if (depot) {
        this.eodDateHandler();
        this.params = {
          depot_id: depot?.depot_id || '',
        };
        this.depot = depot;
        // Only call reloadHandler once initially, no automatic polling
        this.reloadHandler();
      }
    });
  }

  eodDateHandler(): void {
    this.sharedService
      .getEODDate()
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: PayloadResponse) => {
        if (value.status === 200) {
          this.eodDates = value.payload['eod-dates'];
        }
      });
  }

  reloadHandler(): void {
    this.sharedService
      .eodCheckStatus(this.params)
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: PayloadResponse) => {
        if (value.status === 200) {
          const eodProcessDtoList =
            value.payload['check-eod-status']['eodProcessDtoList'];

          this.updateDataSource(eodProcessDtoList);
          this.cdr.markForCheck();

          // Validate button state based on task statuses (if not currently forcing EOD)
          if (!this.isForcingEOD) {
            this.isDisabled = this.shouldDisableForceEOD(eodProcessDtoList);
          }

          this.handleResetForceEOD(eodProcessDtoList);
        }
      });
  }

  shouldDisableForceEOD(payload: any[]): boolean {
    if (!payload || payload.length === 0) {
      return true;
    }

    // If any item has status = 2 (In Progress), disable button
    const hasInProgress = payload.some((item: any) => item.status === 2);
    if (hasInProgress) {
      return true;
    }

    // If all items have status = 1 (Completed), disable button
    const allCompleted = payload.every((item: any) => item.status === 1);
    if (allCompleted) {
      return true;
    }

    // Enable button when there are non-completed items (status = 0 Failed, or status = null Not Started)
    const hasNonCompleted = payload.some(
      (item: any) => item.status === 0 || item.status === null
    );
    if (hasNonCompleted) {
      return false;
    }

    // Default: disable button for safety
    return true;
  }

  startPolling(): void {
    this.stopPolling();

    this.pollingSubscription = this.webSocketService
      .refreshTrigger(WS_TOPICS.eodProcess, 5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.reloadHandler();
      });
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  handleResetForceEOD(payload: any): void {
    // Check if all items have valid end_time (not null and not empty)
    const allHaveEndTime = payload.every((item: any) => {
      return item.end_time !== null && item.end_time !== '';
    });

    // Only stop polling and reset if we're currently forcing EOD and all processes are complete
    if (allHaveEndTime && this.isForcingEOD) {
      this.handleReset();
      this.stopPolling(); // Stop polling when all processes are complete

      // Call api EOD dates to update the eod dates when all processes are complete
      this.eodDateHandler();
    }
  }

  updateDataSource(payload: any): void {
    this.dataSource = payload.map((item: any, index: number) =>
      this.mapPayload(item, index, payload)
    );
  }

  mapPayload(item: any, index: number, fullArray: any[]): IEodProcess {
    const isLastItem = index === fullArray.length - 1;
    const isSamServerAuth = item.task === 'SAM Server Authentication';

    return {
      ...item,
      taskName: item.task,
      startTime: item.start_time,
      endTime: item.end_time,
      status: this.checkStatus(item.status, isLastItem, isSamServerAuth),
    };
  }

  checkStatus(
    status: number | null,
    isLastItem: boolean,
    isSamServerAuth: boolean
  ): string {
    // Special case: Last item is SAM Server Authentication with null status
    if (isLastItem && isSamServerAuth && status === null) {
      return ''; // No label
    }

    // For all other cases
    if (status === null) return 'Not Started';
    if (status === 0) return 'Failed';
    if (status === 1) return 'Completed';
    if (status === 2) return 'In Progress';

    return '';
  }

  clickForceEOD(): void {
    const dialogRef = this.dialog.open(EodConfirmationDialogComponent, {
      width: '500px',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.processForceEOD();
      }
    });
  }

  private processForceEOD(): void {
    this.isDisabled = true;
    this.isForcingEOD = true;
    this.cdr.markForCheck(); // Trigger change detection to update UI immediately

    this.sharedService
      .triggerForceEOD()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (value: PayloadResponse) => {
          if (value.status === 200) {
            // Start polling after successful force EOD trigger
            this.startPolling();
          }
        },
        error: err => {
          console.error('Force EOD failed:', err);
          this.isDisabled = false;
          this.isForcingEOD = false;
          this.cdr.markForCheck();
        },
      });
  }

  handleReset(): void {
    this.isDisabled = false;
    this.isForcingEOD = false;
  }

  formatLastEodDate(dateValue: any): string {
    if (!dateValue) {
      return '';
    }

    // If it's already a Date object, use it directly
    if (dateValue instanceof Date) {
      return this.formatDate(dateValue);
    }

    // If it's a string, handle it
    if (typeof dateValue === 'string' && dateValue.trim() !== '') {
      const trimmedValue = dateValue.trim();
      
      // Check if it's already in DD/MM/YYYY format (with or without time)
      const dateOnlyPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
      const dateTimePattern = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/;
      
      if (dateTimePattern.test(trimmedValue)) {
        // Already in DD/MM/YYYY HH:mm:ss format, return as is
        return trimmedValue;
      } else if (dateOnlyPattern.test(trimmedValue)) {
        // DD/MM/YYYY format without time, add default time
        return `${trimmedValue} 00:00:00`;
      } else {
        // Try to parse as ISO date or other formats
        const parsedDate = new Date(trimmedValue);
        if (!isNaN(parsedDate.getTime())) {
          return this.formatDate(parsedDate);
        }
        // If parsing fails, return the original value
        return trimmedValue;
      }
    }

    // For other types, convert to string
    return String(dateValue);
  }

  private formatDate(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  }

  ngOnDestroy(): void {
    this.stopPolling();
    this.sharedService.updateSelectedDepot(null);
    this.sharedService.resetFormGroup();
    this.filterService.clearSelectedFilters();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
