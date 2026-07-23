import {
  AfterViewInit,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { DepoService } from '@app/services/depo.service';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { IDepoList } from '@app/models/depo';
import { AuthService } from '@app/services/auth.service';
import { UserProfile } from '@app/models/user';
import { CommonService } from '@app/services/common.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatMenuModule,
    RouterModule,
  ],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent implements OnInit, OnDestroy, AfterViewInit {
  isDagw = this.authService.isDagw();
  destroy$ = new Subject<void>();
  depots: IDepoList[] = [];
  depot: IDepoList;
  svcProvCode: string = this.authService.getSvcProvCode();

  systems: { name: string; status: number }[] = [
    { name: 'BOCC', status: 1 },
    { name: 'PMDS', status: 1 },
    { name: 'ABCDE', status: 0 },
    { name: 'FGHIJ', status: 1 },
    { name: 'KLMNO', status: 0 },
  ];

  version: string;

  currentDate: Date;
  isBrowser = signal(false);

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private depoService: DepoService,
    private authService: AuthService,
    private commonService: CommonService
  ) {
    this.isBrowser.set(isPlatformBrowser(platformId));
  }

  ngOnInit(): void {
    const profile = this.authService.fetchProfile() as UserProfile;
    this.version = profile.version;
    this.subscribeToDepoChanges();

    if (this.isDagw) {
      this.depot = profile.depot_list?.[0] || {}
    }
    // this.loadGeneralInformation();
  }

  loadGeneralInformation(): void {
    this.commonService
      .getGeneralInformation(this.isDagw)
      .pipe(takeUntil(this.destroy$))
      .subscribe(response => {
        if (response?.payload?.general_information) {
          const info = response.payload.general_information;
          if (info.version) {
            this.version = info.version;
          }
          if (info.service_provider) {
            this.svcProvCode = info.service_provider;
          }
          if (info.system_connection) {
            this.systems = info.system_connection;
          }
        }
      });
  }

  ngAfterViewInit(): void {
    if (this.isBrowser()) {
      setInterval(() => {
        this.currentDate = new Date();
      }, 1000);
    }
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
      .subscribe(([, depotList]) => {
        this.depots = depotList;

        if (this.isDagw) {
          // const depot_id = this.configService.getConfig('DAGW_DEPOT');
          const depot_id = this.authService.getDefaultDepot().toString();
          this.depot =
            this.depots.find(depot => depot.depot_id === depot_id) ||
            ({} as IDepoList);
        }
      });
  }

  connectedCount(): number {
    return this.systems.filter(system => system.status === 1).length || 0;
  }

  disconnectedCount(): number {
    return this.systems.filter(system => system.status === 0).length || 0;
  }
}
