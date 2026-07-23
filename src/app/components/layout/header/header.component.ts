import { CommonModule, DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Component,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSlideToggleModule, MatSlideToggleChange } from '@angular/material/slide-toggle';

import { FormsModule } from '@angular/forms';
import { MatBadgeModule } from '@angular/material/badge';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterModule } from '@angular/router';
import { mdcsRoutes, dagwRoutes } from '@app/app.routes.config';
import { AuthService } from '@app/services/auth.service';
import { CommonService } from '@app/services/common.service';
import { MessageService } from '@app/services/message.service';
import { DepoRequest } from '@models/common';
import { IDepoList } from '@models/depo';
import { DepoService } from '@services/depo.service';
import { UserProfile } from '@models/user';
import { Subject, takeUntil } from 'rxjs';
import { LogoutConfirmationDialogComponent } from '@app/components/logout-confirmation-dialog/logout-confirmation-dialog.component';
import { NotificationComponent } from '@app/components/notification/notification.component';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import { downloadLogsAsCsv } from '@app/services/request-log.interceptor';
 // @ts-ignore
import * as autoClicker from '../../../../tools/auto-clicker.js';

@Component({
  selector: 'app-header',
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatExpansionModule,
    RouterModule,
    MatSelectModule,
    FormsModule,
    MatListModule,
    CommonModule,
    MatBadgeModule,
    MatDialogModule,
    MatSlideToggleModule,
    NotificationComponent,
    // OverlayModule,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {
  isDummy = environment.useDummyData;
  authService = inject(AuthService);
  private readonly depoService = inject(DepoService);
  private readonly commonService = inject(CommonService);
  private readonly messageService = inject(MessageService);
  private readonly dialog = inject(MatDialog);

  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroy$ = new Subject<void>();

  params: DepoRequest = {
    patternSearch: false,
    search_text: '',
    is_pattern_search: false,
    page_size: 100,
    page_index: 0,
    sort_order: [],
  };
  options: IDepoList[] = [];
  depotId: any;
  dagw = this.authService.isDagw();
  routesUrl: any = this.authService.isDagw() ? dagwRoutes : mdcsRoutes;
  expandedMenu: { [key: string]: boolean } = {};
  activeMenu: string = 'dashboard';

  isOpenMobileMenu: boolean = false;
  settingDefault: any = null;
  userName: string = '';
  givenName: string = '';
  userInitial: string = '';

  @ViewChild('mobileNav', { static: false }) mobileNav!: ElementRef;

  mdcsNavList: any = [
    {
      label: 'Monitoring',
      value: 'monitoring',
      subs: [
        {
          label: 'Bus Operation Status',
          value: 'bus-operation-status',
          href: mdcsRoutes.monitoring?.busOperation,
          access: ['monitoring', 'busOperation', 'view'],
        },
        {
          label: 'Card Key Versions',
          value: 'card-key-versions',
          href: mdcsRoutes.monitoring?.cardKeyVersion,
          access: ['monitoring', 'cardKeyVersion', 'view'],
        },
      ],
    },
    {
      label: 'Bus Management',
      value: 'bus',
      subs: [
        {
          label: 'Daily Bus List',
          value: 'daily-bus-list',
          href: mdcsRoutes.bus?.busList,
          access: ['bus', 'busList', 'view'],
        },
        {
          label: 'Vehicle Map',
          value: 'vehicle-map',
          href: mdcsRoutes.bus?.vehicleList,
          access: ['bus', 'vehicleList', 'view'],
        },
        {
          label: 'Bus Transfer',
          value: 'bus-transfer',
          href: mdcsRoutes.bus?.busTransfer,
          access: ['bus', 'busTransfer', 'view'],
        },
      ],
    },
    {
      label: 'Parameter Management',
      value: 'paramManagement',
      subs: [
        {
          label: 'DAGW Parameter Summary',
          value: 'dagw-parameter-summary',
          href: mdcsRoutes.parameterManagement?.dagwParameter,
          access: ['parameterManagement', 'dagwParameter', 'view'],
        },
        {
          label: 'Parameter Viewer',
          value: 'parameter-viewer',
          href: mdcsRoutes.parameterManagement?.parameterViewer,
          access: ['parameterManagement', 'parameterViewer', 'view'],
        },
        {
          label: 'Parameter File Import',
          value: 'parameter-file-import',
          href: mdcsRoutes.parameterManagement?.importParameter,
          access: ['parameterManagement', 'importParameter', 'view'],
        },
        {
          label: 'Parameter File Export',
          value: 'parameter-file-export',
          href: mdcsRoutes.parameterManagement?.exportParameter,
          access: ['parameterManagement', 'exportParameter', 'view'],
        },
        {
          label: 'Device Application Management System(DAMS)',
          value: 'dams',
          target: '_blank',
          href: 'https://www.google.com',
          access: ['parameterManagement', 'parameterViewer', 'view'],
          requiresCDALink: true,
        },
      ],
    },
    {
      label: 'Parameter Trial',
      value: 'paramTrial',
      subs: [
        {
          label: 'Trial Device Selection',
          value: 'trial-device-selection',
          href: mdcsRoutes.parameterTrial?.trialDeviceSelection,
          access: ['parameterTrial', 'trialDeviceSelection', 'view'],
        },
        {
          label: 'New Parameter Approval',
          value: 'new-parameter-approval',
          href: mdcsRoutes.parameterTrial?.approval,
          access: ['parameterTrial', 'approval', 'view'],
        },
        {
          label: 'Parameter Mode',
          value: 'parameter-mode',
          href: mdcsRoutes.parameterTrial?.parameterMode,
          access: ['parameterTrial', 'parameterMode', 'view'],
        },
        {
          label: 'End Trial',
          value: 'end-trial',
          href: mdcsRoutes.parameterTrial?.endTrial,
          access: ['parameterTrial', 'endTrial', 'view'],
        },
        {
          label: 'Parameter Version Summary',
          value: 'parameter-version-summary',
          href: mdcsRoutes.parameterTrial?.parameterVersionSummary,
          access: ['parameterTrial', 'parameterVersionSummary', 'view'],
        },
      ],
    },
    {
      label: 'Report',
      value: 'report',
      subs: [
        {
          label: 'Ad-Hoc Report',
          value: 'ad-hoc-report',
          // href: mdcsRoutes.report?.adhoc,
          access: ['report', 'adhoc', 'view'],
          subs: [
            // {
            //   label: 'All Daily Report',
            //   value: 'all-daily-report',
            //   href: mdcsRoutes.report?.adhoc?.allDailyReport,
            // },
            {
              label: 'Bus Arrival Exception List',
              value: 'bus-arrival-exception-list',
              href: mdcsRoutes.report?.adhoc?.busArrival,
            },
            {
              label: 'Bus List Audit Trial',
              value: 'bus-list-audit-trial',
              href: mdcsRoutes.report?.adhoc?.busAuditTrial,
            },
            {
              label: 'Bus Data Transfer Details',
              value: 'bus-transfer-report',
              href: mdcsRoutes.report?.adhoc?.busTransferReport,
            },
            {
              label: 'Bus Partial Upload Report',
              value: 'bus-partial-upload-report',
              href: mdcsRoutes.report?.adhoc?.busPartialUploadReport,
            },
            // {
            //   label: 'Daily Bus List Report',
            //   value: 'daily-bus-list-report',
            //   href: mdcsRoutes.report?.adhoc?.dailyBusListReport,
            // },
            {
              label: 'DAGW Monthly Availability Report',
              value: 'dagw-monthly-availability-report',
              href: mdcsRoutes.report?.adhoc?.dagwMonthlyReport,
            },
          ],
        },
        {
          label: 'Daily Report',
          value: 'daily-report',
          // href: mdcsRoutes.report?.dailyReport,
          access: ['report', 'dailyReport', 'view'],
          subs: [
            {
              label: 'Bus Arrival Exception List',
              value: 'bus-arrival-exception-list',
              href: mdcsRoutes.report?.dailyReport?.busArrival,
            },
            {
              label: 'Bus List Audit Trial',
              value: 'bus-list-audit-trial',
              href: mdcsRoutes.report?.dailyReport?.busAuditTrial,
            },
            {
              label: 'Bus Data Transfer Details',
              value: 'bus-transfer-report',
              href: mdcsRoutes.report?.dailyReport?.busTransferReport,
            },
            {
              label: 'Bus Partial Upload Report',
              value: 'bus-partial-upload-report',
              href: mdcsRoutes.report?.dailyReport?.busPartialUploadReport,
            },
            {
              label: 'Daily Bus List Report',
              value: 'daily-bus-list-report',
              href: mdcsRoutes.report?.dailyReport?.dailyBusListReport,
            },
            // {
            //   label: 'DAGW Monthly Availability Report',
            //   value: 'dagw-monthly-availability-report',
            //   href: mdcsRoutes.report?.dailyReport?.dagwMonthlyReport,
            // },
          ],
        },
      ],
    },
    {
      label: 'Maintenance',
      value: 'maintenance',
      subs: [
        {
          label: 'Diagnostics',
          value: 'diagnostics',
          href: mdcsRoutes.maintenance?.diagnostics,
          access: ['maintenance', 'diagnostics', 'view'],
        },
        {
          label: 'EOD Process',
          value: 'eod-process',
          href: mdcsRoutes.maintenance?.eodProcess,
          access: ['maintenance', 'eodProcess', 'view'],
        },
        {
          label: 'Audit Log',
          value: 'audit-log',
          href: mdcsRoutes.maintenance?.auditLog,
          access: ['maintenance', 'auditLog', 'view'],
        },
        {
          label: 'System Info',
          value: 'system-info',
          href: mdcsRoutes.maintenance?.systemInformation,
          access: ['maintenance', 'systemInformation', 'view'],
        },
      ],
    },
  ];

  // Base navigation structure for DAGW
  private readonly dagwNavList: any = [
    {
      label: 'Monitoring',
      value: 'monitoring',
      subs: [
        {
          label: 'Bus Operation Status',
          value: 'bus-operation-status',
          href: dagwRoutes.monitoring?.busOperation,
          access: ['monitoring', 'busOperation', 'view'],
        },
      ],
    },
    {
      label: 'Bus Management',
      value: 'bus',
      subs: [
        {
          label: 'Vehicle Map',
          value: 'vehicle-map',
          href: dagwRoutes.bus?.vehicleList,
          access: ['bus', 'vehicleList', 'view'],
        },
      ],
    },
    {
      label: 'Parameter Management',
      value: 'paramManagement',
      subs: [
        {
          label: 'DAGW Parameter Summary',
          value: 'dagw-parameter-summary',
          href: dagwRoutes.parameterManagement?.dagwParameter,
          access: ['parameterManagement', 'dagwParameter', 'view'],
        },
        {
          label: 'Parameter File Import',
          value: 'parameter-file-import',
          href: dagwRoutes.parameterManagement?.importParameter,
          access: ['parameterManagement', 'importParameter', 'view'],
        },
        {
          label: 'Parameter File Export',
          value: 'parameter-file-export',
          href: dagwRoutes.parameterManagement?.exportParameter,
          access: ['parameterManagement', 'exportParameter', 'view'],
        },
      ],
    },
      {
      label: 'Message Data Management',
      value: 'messageDataManagement',
      subs: [
        {
          label: 'Message File Import',
          value: 'message-file-import',
          href: dagwRoutes.messageDataManagement.messageFileImport,
          access: ['messageDataManagement', 'messageDataImport', 'view'],
        },
        {
          label: 'Message File Export',
          value: 'message-file-export',
          href: dagwRoutes.messageDataManagement.messageFileExport,
          access: ['messageDataManagement', 'messageDataExport', 'view'],
        },
      ],
    },
    {
      label: 'Parameter Trial',
      value: 'paramTrial',
      subs: [
        {
          label: 'Trial Device Selection',
          value: 'trial-device-selection',
          href: dagwRoutes.parameterTrial?.trialDeviceSelection,
          access: ['parameterTrial', 'trialDeviceSelection', 'view'],
        },
      ],
    },
    {
      label: 'Report',
      value: 'report',
      subs: [
        {
          label: 'Bus Arrival Exception List',
          value: 'bus-arrival-exception-list',
          href: dagwRoutes.report?.busArrival,
          access: ['report', 'busArrival', 'view'],
        },
      ],
    },
    {
      label: 'Maintenance',
      value: 'maintenance',
      subs: [
        {
          label: 'Diagnostics',
          value: 'diagnostics',
          href: dagwRoutes.maintenance?.diagnostics,
          access: ['maintenance', 'diagnostics', 'view'],
        },
        {
          label: 'System Info',
          value: 'system-info',
          href: dagwRoutes.maintenance?.systemInformation,
          access: ['maintenance', 'systemInformation', 'view'],
        },
      ],
    },
  ]

  // Filtered navigation list based on access rights
  navList: any[] = [];

  constructor(private readonly eRef: ElementRef) {}

  ngOnInit(): void {
    // Load user profile data
    this.loadUserProfile();

    // Load settings
    this.commonService
      .getSettingDefault()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: value => {
          this.settingDefault = value;
        },
      });

    // Build filtered navigation list based on access rights
    this.buildNavList();

    // Subscribe to depot changes
    this.depoService.depo$
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: string) => {
        if (value && this.options.length > 0) {
          this.depotId = this.options.find(x => x.depot_id === value);
        }
      });
  }

  ngAfterViewInit() {
    this.setSideBarHeight();
  }

  @HostListener('window:resize')
  onResize() {
    this.setSideBarHeight();
  }

  setSideBarHeight() {
    const sideBar = this.document.querySelector('.mobile-nav') as HTMLElement;
    const mainContent = this.document.querySelector(
      '.main-container'
    ) as HTMLElement;
    sideBar.style.height = mainContent.clientHeight + 'px';
  }

  // busSelect(event: any) {
  //   this.depoService.updateDepo(event.depot_id);
  // }

  @HostListener('document:click', ['$event'])
  onClick(event: Event) {
    if (!this.isOpenMobileMenu) return;

    const clickedInside = this.mobileNav?.nativeElement.contains(event.target);

    if (!clickedInside) {
      this.isOpenMobileMenu = false;
    }
  }

  menuHandler(status: string, menu: string) {
    // console.log(status, menu);
    if (status == 'open') {
      this.expandedMenu[menu] = true;
    } else {
      this.expandedMenu[menu] = false;
    }
  }

  setActiveMu(menu: string) {
    this.activeMenu = menu;
  }

  checkNavActive(routeLink: string): boolean {
    return this.router.url.includes(routeLink);
  }

  toggleMobileMenu(event: Event) {
    event.stopPropagation();
    this.isOpenMobileMenu = !this.isOpenMobileMenu;
  }

  logOut() {
    this.showLogoutConfirmation();
  }

  redirectToCDA() {
    const cdaLink = this.authService.getCDALink();
    if (cdaLink) {
      window.open(cdaLink, '_blank');
    }
  }

  /**
   * Build navigation list filtered by access rights
   */
  private buildNavList(): void {
    const baseNavList = this.dagw ? this.dagwNavList : this.mdcsNavList;
    // console.log('Base Nav List:', baseNavList);
    const module = this.dagw ? 'dagw' : 'mdcs';
    const routePrefix = this.dagw ? '/dagw/' : '/mdcs/';

    this.navList = baseNavList
      .map((nav: any) => {
        // Check if parent menu should be shown
        const hasParentAccess = nav.subs?.some((sub: any) => {
          if (sub.access) {
            return this.authService.hasAccess(sub.access, module);
          }
          // For nested subs (like Report structure)
          if (sub.subs) {
            return sub.subs.some((child: any) =>
              child.access
                ? this.authService.hasAccess(child.access, module)
                : true
            );
          }
          return true;
        });

        if (!hasParentAccess) {
          return null;
        }

        // Filter subs based on access
        const filteredSubs = nav.subs
          ?.map((sub: any) => {
            // Handle nested subs (like Report structure)
            if (sub.subs) {
              // Check parent sub access first
              if (sub.access) {
                const hasAccess = this.authService.hasAccess(
                  sub.access,
                  module
                );
                if (!hasAccess) {
                  return null;
                }
              }

              const filteredNestedSubs = sub.subs
                .filter((child: any) => {
                  if (child.access) {
                    return this.authService.hasAccess(child.access, module);
                  }
                  return true;
                })
                .map((child: any) => ({
                  ...child,
                  href: child.href ? routePrefix + child.href : child.href,
                }));

              if (filteredNestedSubs.length === 0) {
                return null;
              }

              // Remove href when sub has nested subs (should be a menu trigger, not a direct link)
              const { href, ...subWithoutHref } = sub;
              return {
                ...subWithoutHref,
                subs: filteredNestedSubs,
              };
            }

            // Handle regular subs with access check
            if (sub.access) {
              const hasAccess = this.authService.hasAccess(sub.access, module);
              if (!hasAccess) {
                return null;
              }
            }

            // Special handling for DAMS link
            if (sub.value === 'dams' || sub.requiresCDALink) {
              const hasParamViewerAccess = this.authService.hasAccess(
                ['parameterManagement', 'parameterViewer', 'view'],
                'mdcs'
              );
              const hasCDALink = this.authService.getCDALink();
              if (!hasParamViewerAccess || !hasCDALink) {
                return null;
              }
              return {
                ...sub,
                href: hasCDALink,
                action: 'redirectToCDA',
              };
            }

            // Add route prefix to href
            return {
              ...sub,
              href: sub.href ? routePrefix + sub.href : sub.href,
            };
          })
          .filter((sub: any) => sub !== null);

        return {
          ...nav,
          subs: filteredSubs,
        };
      })
      .filter((nav: any) => nav !== null && nav.subs?.length > 0);
  }

  /**
   * Load user profile data from auth service
   */
  private loadUserProfile(): void {
    const profile = this.authService.fetchProfile() as UserProfile;
    this.userName = profile?.access_token_profile?.user_name || '';
    this.givenName = profile?.access_token_profile?.given_name || '';
    this.userInitial = this.givenName
      ? this.givenName.charAt(0).toUpperCase()
      : '';

    // Update depot list from profile
    if (profile?.depot_list) {
      const formatData = profile.depot_list.map((item: any) => {
        return <IDepoList>{
          id: item.id,
          version: item.version,
          depot_id: item.depot_id,
          depot_code: item.depot_code,
          depot_name: item.depot_name,
          svc_provider: item.svc_prov_info,
          value: item.depot_name,
        };
      });

      this.options = formatData;
      this.depoService.updateDepoList(formatData);
      if (formatData.length > 0) {
        this.depoService.updateDepo(formatData[0]?.depot_id);
      }
    }
  }

  private readonly autoClickTimerId: ReturnType<typeof setInterval> | null = null;
  private readonly autoClickIndex = 0;

  private showLogoutConfirmation() {
    const dialogRef = this.dialog.open(LogoutConfirmationDialogComponent, {
      width: '400px',
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.authService.logout();
        if (this.settingDefault?.authenticate_adfs_url) {
          window.location.href = '/adfs-logout';
        } else {
          window.location.href = this.settingDefault?.logout_url || '/';
        }
      }
    });
  }

  toggleAutoClick(event: MatSlideToggleChange) {
    if (event.checked) {
      autoClicker.startAutoClicker();
    } else {
      autoClicker.stopAutoClicker();
      downloadLogsAsCsv();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
