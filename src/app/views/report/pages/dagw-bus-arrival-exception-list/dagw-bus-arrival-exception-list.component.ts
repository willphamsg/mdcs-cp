import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormGroup, FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  MatDatepickerInputEvent,
  MatDatepickerModule,
} from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabChangeEvent, MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { IReportList } from '@app/models/daily-report';
import { AuthService } from '@app/services/auth.service';
import { FilterService } from '@app/services/filter.service';
import { BreadcrumbsComponent } from '@components/layout/breadcrumbs/breadcrumbs.component';
import TableHeader from '@data/daily-report-header.json';
import {
  DAGWDailyReportRequest,
  DropdownList,
  IHeaderGeneral,
  PayloadResponse,
} from '@models/common';
import { IDepoList } from '@models/depo';
import { TabList } from '@models/tab-list';
import { DailyReportService } from '@services/daily-report.service';
import { DepoService } from '@services/depo.service';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { ReportService } from '@services/report.service';
import { DD_MM_YYYY_FORMAT } from '@app/shared/utils/date-time';

@Component({
  selector: 'app-bus-arrival-exception-list',
  standalone: true,
  imports: [
    BreadcrumbsComponent,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    RouterModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatDatepickerModule,
    MatInputModule,
    MatSortModule,
    MatMenuModule,
    CommonModule,
    MatDividerModule,
    FormsModule,
    MatSelectModule
  ],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
  ],
  templateUrl: './dagw-bus-arrival-exception-list.component.html',
  styleUrl: './dagw-bus-arrival-exception-list.component.scss',
})
export class DAGWBusArrivalExceptionListComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();

  headerData = TableHeader;
  displayedColumns: string[] = TableHeader.map((x: IHeaderGeneral) => {
    return x.field;
  });
  rowCount: number = 0;
  searchForm: FormGroup;
  options: DropdownList[] = [];

  depots: IDepoList[] = [];
  depotSelected: string = '';

  dataSource: IReportList[] = [];

  selectedDate: string;
  today = new Date();

  params: DAGWDailyReportRequest = {
    business_day: '',
    depot: 0,
    svc_Provider_Id: 0,
  };

  tabList: TabList[] = [
    {
      key: 'busArrivalExceptionList',
      title: 'Bus Arrival Exception List',
    },
  ];

  reportTypes: DropdownList[] = [
    {
      id: '1',
      value: 'Bus Arrival Exception List',
    },
  ];

  expandedMenu: boolean = false;
  svcProviderID = this.authService.getSVCProvider();

  isButtonClick: boolean = false;


  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatMenuTrigger) trigger: MatMenuTrigger;

  constructor(
    private readonly dailyReportService: DailyReportService,
    private readonly authService: AuthService,
    private readonly depoService: DepoService,
    public readonly dialog: MatDialog,
    private readonly filterService: FilterService,
    private readonly reportService: ReportService,
  ) {}

  ngOnInit() {
    this.selectedDate = new Date().toISOString().split('T')[0];
    this.subscribeToDepoChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  subscribeToDepoChanges(): void {
    const depot$ = this.depoService.depo$;
    const depotList$ = this.depoService.depoList$;

    combineLatest([depot$, depotList$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([depoValue, depotList]) => {
        this.params.depot = Number.parseInt(depoValue, 10);
        this.params.svc_Provider_Id = Number.parseInt(this.svcProviderID!, 10);
        this.params.business_day = this.selectedDate;
        this.depots = depotList;
        // this.fetchDailyReportList();
      });
  }

  changeBusinessDay(type: string, event: MatDatepickerInputEvent<Date>) {
    const year = event.value!.getFullYear();
    const month = String(event.value!.getMonth() + 1).padStart(2, '0'); // getMonth() is 0-based
    const day = String(event.value!.getDate()).padStart(2, '0');

    this.selectedDate = `${year}-${month}-${day}`;
    this.subscribeToDepoChanges();
  }

  menuHandler(isOpen: boolean) {
    this.expandedMenu = isOpen;
  }

  // downloadHandler() {
  //   this.dialog.open(DownloadDialogComponent, {
  //     width: '100%',
  //     height: '100%',
  //     maxHeight: '266px',
  //     maxWidth: '420px',
  //     panelClass: ['download-dialog'],
  //     autoFocus: 'first-heading',
  //     disableClose: true,
  //     data: {
  //       progress: '100',
  //       totol: '100',
  //     },
  //   });
  // }

  fetchReportData(): void {
    if (!this.depotSelected || !this.selectedDate){
      console.warn('Please select depot and business day before viewing report');
      return;
    }

    this.isButtonClick = true;
    this.reportService.getReportData(this.params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (value: PayloadResponse) => {
          if (value.status == 200) {
            this.dataSource = value.payload['bus_arrival_exception_records'] || []
            this.isButtonClick = false;
          }
        },
      });
  }

  onTabChange(event: MatTabChangeEvent) {
    this.filterService.clearSelectedFilters();
    // this.params.report_type = event.tab.textLabel;
    this.subscribeToDepoChanges();
  }

  exportCSV(): void {
    this.downloadCSVFromArray(this.dataSource);
  }

  downloadCSVFromArray(data: any[]): void {
    if (!data || data.length === 0) {
      console.warn('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const record of data) {
      const row = headers.map(key => {
        const value = record[key] ?? '';
        return `"${String(value).replaceAll('"', '""')}"`;
      });
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'bus_arrival_exceptions.csv');
    link.click();
  }

  print(): void {
    const printContents = document.getElementById('print-section')?.innerHTML;
    const originalContents = document.body.innerHTML;

    if (printContents) {
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      location.reload(); // to restore event bindings after print
    }
  }
}
