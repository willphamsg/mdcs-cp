import { Component, ViewEncapsulation } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { BreadcrumbsComponent } from '@app/components/layout/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-daily-report',
  imports: [
    MatTableModule,
    MatCardModule,
    MatToolbarModule,
    MatTabsModule,
    MatMenuModule,
    MatDividerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    BreadcrumbsComponent,
    ReactiveFormsModule,
    MatInputModule,
  ],
  templateUrl: './daily-report.component.html',
  styleUrl: './daily-report.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DailyReportComponent {
  constructor(private route: ActivatedRoute) {}

  getReportType(): string {
    const reportType = this.route.snapshot?.firstChild?.routeConfig?.path;
    if (!reportType) return '';

    return reportType;
  }

  getPageTitle(): string {
    const titles: { [key: string]: string } = {
      'report/daily-report/all-daily-report': 'All Daily Report',
      'report/daily-report/bus-arrival-exception-list':
        'Bus Arrival Exception List',
      'report/daily-report/bus-list-audit-trial': 'Bus List Audit Trial',
      'report/daily-report/bus-partial-upload-report':
        'Bus Partial Upload Report',
      'report/daily-report/bus-transfer-report': 'Bus Transfer Report',
      'report/daily-report/daily-bus-list-report': 'Daily Bus List Report',
      'report/daily-report/dagw-monthly-availability-report':
        'DAGW Monthly Availability Report',
    };

    const reportType = this.getReportType();
    return reportType in titles ? titles[reportType] : '';
  }
}
