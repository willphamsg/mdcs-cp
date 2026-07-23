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
  selector: 'app-ad-hoc',
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
  templateUrl: './ad-hoc.component.html',
  styleUrl: './ad-hoc.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AdHocComponent {
  constructor(private readonly route: ActivatedRoute) {}

  getAdhocType(): string {
    const adhocType = this.route.snapshot?.firstChild?.routeConfig?.path;
    if (!adhocType) return '';

    return adhocType;
  }

  getPageTitle(): string {
    const titles: { [key: string]: string } = {
      'report/adhoc/bus-arrival-exception-list': 'Bus Arrival Exception List',
      'report/adhoc/bus-list-audit-trial': 'Bus List Audit Trial',
      'report/adhoc/bus-partial-upload-report': 'Bus Partial Upload Report',
      'report/adhoc/bus-transfer-report': 'Bus Transfer Report',
      'report/adhoc/daily-bus-list-report': 'Daily Bus List Report',
      'report/adhoc/dagw-monthly-availability-report':
        'DAGW Monthly Availability Report',
    };

    const adhocType = this.getAdhocType();
    return adhocType in titles ? titles[adhocType] : '';
  }
}
