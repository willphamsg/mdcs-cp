import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { IStatusCategory } from '@app/models/maitenance';
import {
  DepotParam,
  MaintenanceSharedService,
} from '@app/services/maintenance-shared.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-diagnostics',
  standalone: true,
  imports: [
    MatTableModule,
    MatCardModule,
    MatToolbarModule,
    MatTabsModule,
    MatMenuModule,
    MatDividerModule,
    CommonModule,
  ],
  templateUrl: './diagnostics.component.html',
  styleUrls: ['./diagnostics.component.scss'],
})
export class DiagnosticsComponent implements OnInit, OnDestroy {
  depot: IDepoList | null = null;
  params: DepotParam;
  categoryItems: IStatusCategory[] = [];
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly sharedService: MaintenanceSharedService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  // TODO: Create a loading screen for while waiting for api response
  ngOnInit(): void {
    this.sharedService.selectedDepot$
      .pipe(takeUntil(this.destroy$))
      .subscribe(depot => {
        if (depot) {
          this.params = {
            depot_id: depot?.depot_id || '',
          };
          this.depot = depot;
          this.sharedService
            .searchDiagnostic(this.params)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (value: PayloadResponse) => {
                if (value.status == 200) {
                  this.categoryItems = value.payload['diagnostics_item'];
                  this.cdr.detectChanges();
                }
              },
            });
        }
      });
  }

  ngOnDestroy(): void {
    this.sharedService.updateSelectedDepot(null);
    this.sharedService.resetFormGroup();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
