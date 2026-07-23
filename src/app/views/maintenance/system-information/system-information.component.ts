import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { ISystemInfo } from '@app/models/maitenance';
import {
  DepotParam,
  MaintenanceSharedService,
} from '@app/services/maintenance-shared.service';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '@app/services/auth.service';

@Component({
  selector: 'app-system-information',
  standalone: true,
  imports: [
    MatCardModule,
    MatMenuModule,
    MatTableModule,
    CommonModule,
    MatGridListModule,
    MatExpansionModule,
  ],
  templateUrl: './system-information.component.html',
  styleUrl: './system-information.component.scss',
})
export class SystemInformationComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  mdcsInformation: ISystemInfo[] = [];
  dagwInformation: ISystemInfo[] = [];
  dagw = this.authService.isDagw();


  mdcsServiceDetails: { [key: string]: number } = {};
  dagwServiceDetails: { [key: string]: number } = {};
  mdcsServiceNames: string[] = [];
  dagwServiceNames: string[] = [];

  mdcsLastUpdate: string = '';
  dagwLastUpdate: string = '';

  params: DepotParam;
  depot: IDepoList | null = null;

  constructor(private readonly sharedService: MaintenanceSharedService, private readonly authService: AuthService) {}

  ngOnInit(): void {
    this.sharedService.selectedDepot$.subscribe(depot => {
      if (depot) {
        this.params = {
          depot_id: depot?.depot_id || '',
        };
        this.depot = depot;
        this.sharedService
          .searchSystemInfo(this.params)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (value: PayloadResponse) => {
              if (value.status == 200) {
                this.mdcsInformation = value.payload['mdcs-information'];
                this.dagwInformation = value.payload['dagw-information'];
                this.mdcsLastUpdate = value.payload['mdcs-last-updated'];
                this.dagwLastUpdate = value.payload['dagw-last-updated'];
                this.mdcsServiceDetails =
                  value.payload['mdcs-service-details'] || {};
                this.dagwServiceDetails =
                  value.payload['dagw-service-details'] || {};
                this.mdcsServiceNames = Object.keys(this.mdcsServiceDetails);
                this.dagwServiceNames = Object.keys(this.dagwServiceDetails);


                console.log('MDCS Information:', this.mdcsInformation);
                console.log('DAGW Information:', this.dagwInformation);
              }
            },
          });
      }
    });
  }


  getAutoExpandedValue(idx: number, system: 'mdcs' | 'dagw'): boolean {
    const source = system === 'mdcs' ? this.mdcsInformation : this.dagwInformation;
    const section: any = source?.[idx] || {}
    const details = section?.details || [];
    return details.some((detail: any) => detail.value === 'Degraded' || detail.value === 'Down');
  }

  ngOnDestroy(): void {
    this.sharedService.updateSelectedDepot(null);
    this.sharedService.resetFormGroup();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
