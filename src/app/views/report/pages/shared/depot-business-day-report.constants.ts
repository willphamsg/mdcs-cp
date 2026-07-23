import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  MatOptionModule,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { SelectedFilterComponent } from '@app/components/filter/selected-filter/selected-filter.component';
import { SSRSReportViewerComponent } from '@components/ssrs-reportviewer/ssrs-reportviewer.component';
import { DD_MM_YYYY_FORMAT } from '@app/shared/utils/date-time';

export const DEPOT_BUSINESS_DAY_REPORT_IMPORTS = [
  MatTableModule,
  MatInputModule,
  MatCardModule,
  MatButtonModule,
  MatOptionModule,
  MatDatepickerModule,
  MatFormFieldModule,
  MatSelectModule,
  MatIconModule,
  MatMenuModule,
  MatDividerModule,
  FormsModule,
  SelectedFilterComponent,
  SSRSReportViewerComponent,
  RouterModule,
];

export const DEPOT_BUSINESS_DAY_REPORT_PROVIDERS = [
  provideNativeDateAdapter(),
  { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
  { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
];
