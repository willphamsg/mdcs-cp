import { Routes } from '@angular/router';
import { SignInComponent } from './views/sign-in/sign-in.component';
import { WelComeComponent } from './views/welcome/welcome.component';
import { LayoutComponent } from './components/layout/layout.component';
import { AuthGuard } from './guards/auth.guard';
import { UserViewComponent } from './views/user/user-view/user-view.component';
import { BusExceptionListSearchComponent } from './views/bus/bus-exception-list/bus-exception-list-search.component';
import { BusSearchComponent } from './views/bus/daily-bus-list/search/bus-search.component';
import { DagwGuard, MdcsGuard } from './guards/dagw.guard';

import { VehicleSearchComponent } from './views/bus/vehicle/search/vehicle-search.component';
import { BusOperationSearchComponent } from './views/monitoring/bus-operation/bus-operation-search.component';
import { ViewCardKeyVersionComponent } from './views/monitoring/card-key-version/card-key-version.component';
import { BusTransferSearchComponent } from './views/bus/bus-transfer/search/bus-transfer-search.component';
// import { DailyReportComponent } from './views/daily-report/search/daily-report-search.component';

import { NewParameterApprovalSearchComponent } from './views/parameter-trial/new-parameter-approval/search/new-parameter-approval-search.component';
import { ParameterModeSearchComponent } from './views/parameter-trial/parameter-mode/search/parameter-mode-search.component';
import { TrialDeviceSelectionSearchComponent } from './views/parameter-trial/trial-device-selection/search/trial-device-selection-search.component';
import { ParameterVersionSummarySearchComponent } from './views/parameter-trial/parameter-version-summary/search/parameter-version-summary-search.component';
import { EndTrialSearchComponent } from './views/parameter-trial/end-trial/search/end-trial-search.component';
// import { AdhocReportsComponent } from '@views/adhoc-reports/search/adhoc-reports-search.component';
import { DagwParameterSummaryComponent } from './views/parameter-management/dagw-parameter-summary/dagw-parameter-summary.component';
import { ParameterViewerComponent } from './views/parameter-management/parameter-viewer/parameter-viewer.component';
import { ParameterFileImportComponent } from './views/parameter-management/parameter-file-import/parameter-file-import.component';
import { ParameterFileExportComponent } from './views/parameter-management/parameter-file-export/parameter-file-export.component';
import { DiagnosticsComponent } from './views/maintenance/diagnostics/diagnostics.component';
import { MaintenanceComponent } from './views/maintenance/maintenance.component';
import { EodProcessComponent } from './views/maintenance/eod-process/eod-process.component';
import { AuditLogComponent } from './views/maintenance/audit-log/audit-log.component';
import { SystemInformationComponent } from './views/maintenance/system-information/system-information.component';
import { NotificationListComponent } from './components/notification/notification-list/notification-list.component';
import { EventHistoryComponent } from './components/layout/footer/event-history/event-history.component';
import { AdfsSignInComponent } from './views/adfs-sign-in/adfs-sign-in.component';
import { RoleGuard } from './guards/role.guard';
import { MENU_ACCESS } from './services/role-access.config';
import { ADFSLogoutComponent } from './views/adfs-logout/adfs-logout.component';
import { NotFoundComponent } from './views/not-found/not-found.component';
import { UnauthorizedComponent } from './views/unauthorized/unauthorized.component';

import { DailyReportComponent } from './views/report/daily-report/daily-report.component';
import { AdHocComponent } from './views/report/ad-hoc/ad-hoc.component';

import { BusArrivalExceptionListComponent } from './views/report/pages/bus-arrival-exception-list/bus-arrival-exception-list.component';
import { DAGWBusArrivalExceptionListComponent } from './views/report/pages/dagw-bus-arrival-exception-list/dagw-bus-arrival-exception-list.component';
import { BusListAuditTrialComponent } from './views/report/pages/bus-list-audit-trial/bus-list-audit-trial.component';
import { BusPartialUploadComponent } from './views/report/pages/bus-partial-upload/bus-partial-upload.component';
import { DagwMonthlyReportComponent } from './views/report/pages/dagw-monthly-report/dagw-monthly-report.component';
import { DailyBusListReportComponent } from './views/report/pages/daily-bus-list-report/daily-bus-list-report.component';
import { BusTransferReportComponent } from './views/report/pages/bus-transfer-report/bus-transfer-report.component';
import { mdcsRoutes, dagwRoutes } from './app.routes.config';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./views/suspend/suspend.component').then(m => m.SuspendComponent),
    pathMatch: 'full',
    data: { title: 'Loading' },
  },
  {
    path: 'sign-in',
    component: SignInComponent,
    data: { title: 'Login' },
  },
  {
    path: 'welcome',
    component: WelComeComponent,
    data: { title: 'Welcome' },
  },
  {
    path: 'adfs-sign-in',
    component: AdfsSignInComponent,
    data: { title: 'ADFS Login' },
  },
  {
    path: 'adfs-logout',
    component: ADFSLogoutComponent,
    data: {
      title: 'Logout',
    },
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent,
    data: { title: 'Unauthorized' },
  },
  {
    path: 'mdcs',
    component: LayoutComponent,
    canActivate: [AuthGuard, MdcsGuard],
    children: [
      {
        path: mdcsRoutes?.dashboard?.home,
        loadComponent: () =>
          import('./views/dashboard/home/home.component').then(
            m => m.HomeComponent
          ),
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.dashboard.home.view,
          title: 'Dashboard',
        },
      },
      {
        path: mdcsRoutes?.user,
        component: UserViewComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.user.view,
          title: 'User',
        },
      },
      {
        path: mdcsRoutes?.monitoring?.busOperation,
        component: BusOperationSearchComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.monitoring.busOperation.view,
          title: 'Bus Operation Status',
        },
      },
      {
        path: mdcsRoutes?.monitoring?.cardKeyVersion,
        component: ViewCardKeyVersionComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.monitoring.cardKeyVersion.view,
          title: 'Card Key Version',
        },
      },
      {
        path: mdcsRoutes?.bus?.busExpList,
        component: BusExceptionListSearchComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.bus.busExpList.view,
          title: 'Bus Exception List',
        },
      },
      {
        path: mdcsRoutes?.bus?.busList,
        component: BusSearchComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.bus.busList.view,
          title: 'Daily Bus List',
        },
      },
      {
        path: mdcsRoutes?.bus?.vehicleList,
        component: VehicleSearchComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.bus.vehicleList.view,
          title: 'Vehicle Map',
        },
      },
      {
        path: mdcsRoutes?.bus?.busTransfer,
        component: BusTransferSearchComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.bus.busTransfer.view,
          title: 'Bus Transfer',
        },
      },
      {
        path: '',
        component: AdHocComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.report.adhoc.view,
          title: 'Adhoc Report',
        },
        children: [
          {
            path: mdcsRoutes?.report?.adhoc?.busArrival,
            component: BusArrivalExceptionListComponent,
          },
          {
            path: mdcsRoutes?.report?.adhoc?.busAuditTrial,
            component: BusListAuditTrialComponent,
          },
          {
            path: mdcsRoutes?.report?.adhoc?.busPartialUploadReport,
            component: BusPartialUploadComponent,
          },
          {
            path: mdcsRoutes?.report?.adhoc?.busTransferReport,
            component: BusTransferReportComponent,
          },
          {
            path: mdcsRoutes?.report?.adhoc?.dailyBusListReport,
            component: DailyBusListReportComponent,
          },
          {
            path: mdcsRoutes?.report?.adhoc?.dagwMonthlyReport,
            component: DagwMonthlyReportComponent,
          },
        ],
      },
      {
        path: '',
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.report.dailyReport.view,
          title: 'Daily Report',
        },
        component: DailyReportComponent,
        children: [
          // {
          //   path: mdcsRoutes?.report?.dailyReport?.allDailyReport,
          //   component: AllDailyReportComponent,
          // },
          {
            path: mdcsRoutes?.report?.dailyReport?.busArrival,
            component: BusArrivalExceptionListComponent,
          },
          {
            path: mdcsRoutes?.report?.dailyReport?.busAuditTrial,
            component: BusListAuditTrialComponent,
          },
          {
            path: mdcsRoutes?.report?.dailyReport?.busPartialUploadReport,
            component: BusPartialUploadComponent,
          },
          {
            path: mdcsRoutes?.report?.dailyReport?.busTransferReport,
            component: BusTransferReportComponent,
          },
          {
            path: mdcsRoutes?.report?.dailyReport?.dailyBusListReport,
            component: DailyBusListReportComponent,
          },
          {
            path: mdcsRoutes?.report?.dailyReport?.dagwMonthlyReport,
            component: DagwMonthlyReportComponent,
          },
        ],
      },
      {
        path: mdcsRoutes?.parameterTrial?.approval,
        component: NewParameterApprovalSearchComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.parameterTrial.approval.view,
          title: 'New Parameter Approval',
        },
      },
      {
        path: mdcsRoutes?.parameterTrial?.parameterMode,
        component: ParameterModeSearchComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.parameterTrial.parameterMode.view,
          title: 'Parameter Mode',
        },
      },
      {
        path: mdcsRoutes?.parameterTrial?.trialDeviceSelection,
        component: TrialDeviceSelectionSearchComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.parameterTrial.trialDeviceSelection.view,
          title: 'Trial Device Selection',
        },
      },
      {
        path: mdcsRoutes?.parameterTrial?.parameterVersionSummary,
        component: ParameterVersionSummarySearchComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.parameterTrial.parameterVersionSummary.view,
          title: 'Parameter Version Summary',
        },
      },
      {
        path: mdcsRoutes?.parameterTrial?.endTrial,
        component: EndTrialSearchComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.parameterTrial.endTrial.view,
          title: 'End Trial',
        },
      },
      {
        path: mdcsRoutes?.parameterManagement?.dagwParameter,
        component: DagwParameterSummaryComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.parameterManagement.dagwParameter.view,
          title: 'DAGW Parameter Summary',
        },
      },
      {
        path: mdcsRoutes?.parameterManagement?.parameterViewer,
        component: ParameterViewerComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.parameterManagement.parameterViewer.view,
          title: 'Parameter Viewer',
        },
      },
      {
        path: mdcsRoutes?.parameterManagement?.importParameter,
        component: ParameterFileImportComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.parameterManagement.importParameter.view,
          title: 'Import Parameter File',
        },
      },
      {
        path: mdcsRoutes?.parameterManagement?.exportParameter,
        component: ParameterFileExportComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.parameterManagement.exportParameter.view,
          title: 'Export Parameter File',
        },
      },
      // {
      //   path: mdcsRoutes?.maintenance?.diagnostics,
      //   component: DiagnosticsComponent,
      //   canActivate: [RoleGuard],
      //   data: {
      //     roles: MENU_ACCESS.mdcs.maintenance.diagnostics.view,
      //     title: 'Diagnostics',
      //   },
      // },
      // {
      //   path: mdcsRoutes?.maintenance?.eodProcess,
      //   component: EodProcessComponent,
      //   canActivate: [RoleGuard],
      //   data: {
      //     roles: MENU_ACCESS.mdcs.maintenance.eodProcess.view,
      //     title: 'End of Day Process',
      //   },
      // },
      // {
      //   path: mdcsRoutes?.maintenance?.systemInformation,
      //   component: SystemInformationComponent,
      //   canActivate: [RoleGuard],
      //   data: {
      //     roles: MENU_ACCESS.mdcs.maintenance.systemInformation.view,
      //     title: 'System Information',
      //   },
      // },
      {
        path: '',
        component: MaintenanceComponent,
        children: [
          {
            path: mdcsRoutes?.maintenance?.diagnostics,
            component: DiagnosticsComponent,
            canActivate: [RoleGuard],
            data: {
              roles: MENU_ACCESS.mdcs.maintenance.diagnostics.view,
              title: 'Diagnostics',
            },
          },
          {
            path: mdcsRoutes?.maintenance?.eodProcess,
            component: EodProcessComponent,
            canActivate: [RoleGuard],
            data: {
              roles: MENU_ACCESS.mdcs.maintenance.eodProcess.view,
              title: 'End of Day Process',
            },
          },
          {
            path: mdcsRoutes?.maintenance?.systemInformation,
            component: SystemInformationComponent,
            canActivate: [RoleGuard],
            data: {
              roles: MENU_ACCESS.mdcs.maintenance.systemInformation.view,
              title: 'System Information',
            },
          },
        ],
      },
      {
        path: mdcsRoutes?.maintenance?.auditLog,
        component: AuditLogComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.maintenance.auditLog.view,
          title: 'Audit Log',
        },
      },
      {
        path: mdcsRoutes?.notification,
        component: NotificationListComponent,
      },
      {
        path: mdcsRoutes?.eventHistory,
        component: EventHistoryComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.mdcs.eventHistory.view,
          title: 'Event History',
        },
      },
    ],
  },
  {
    path: 'dagw',
    component: LayoutComponent,
    canActivate: [AuthGuard, DagwGuard],
    children: [
      // {
      //   path: dagwRoutes.dashboard,
      //   component: DagwDashboardComponent,
      //   canActivate: [RoleGuard],
      //   data: { roles: MENU_ACCESS.dagw.dashboard.view },
      // },
      {
        path: dagwRoutes.monitoring.busOperation,
        component: BusOperationSearchComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.dagw.monitoring.busOperation.view,
          title: 'Bus Operation Status',
        },
      },
      {
        path: dagwRoutes.bus.vehicleList,
        component: VehicleSearchComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.dagw.bus.vehicleList.view,
          title: 'Vehicle Map',
        },
      },
      {
        path: dagwRoutes?.parameterManagement?.dagwParameter,
        component: DagwParameterSummaryComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.dagw.parameterManagement.dagwParameter.view,
          title: 'DAGW Parameter Summary',
        },
      },
      {
        path: dagwRoutes?.parameterManagement?.importParameter,
        component: ParameterFileImportComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.dagw.parameterManagement.importParameter.view,
          title: 'Import Parameter File',
        },
      },
      {
        path: dagwRoutes?.parameterManagement.exportParameter,
        component: ParameterFileExportComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.dagw.parameterManagement.exportParameter.view,
          title: 'Export Parameter File',
        },
      },
      {
        path: dagwRoutes?.parameterTrial?.trialDeviceSelection,
        component: TrialDeviceSelectionSearchComponent,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.dagw.parameterTrial.trialDeviceSelection.view,
          title: 'Trial Device List',
        },
      },
      {
        path: dagwRoutes?.messageDataManagement?.messageFileImport,
        loadComponent: () =>
          import(
            './views/message-data-management/message-data-import/message-data-import.component'
          ).then(m => m.MessageDataImportComponent),

        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.dagw.messageDataManagement.messageDataImport.view,
          title: 'Message Data File Import',
        },
      },
      {
        path: dagwRoutes?.messageDataManagement?.messageFileExport,
        loadComponent: () =>
          import(
            './views/message-data-management/message-data-export/message-data-export.component'
          ).then(m => m.MessageDataExportComponent),
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.dagw.messageDataManagement.messageDataExport.view,
          title:  'Message Data File Export'
        },
      },
      // {
      //   path: dagwRoutes?.report?.busArrival,
      //   component: BusArrivalExceptionListComponent,
      //   data: {
      //     roles: MENU_ACCESS.dagw.report.busArrival.view,
      //     title:  'Bus Arrival Exception List'
      //   },  
      // },
       {
        path: dagwRoutes?.report?.busArrival,
        canActivate: [RoleGuard],
        data: {
          roles: MENU_ACCESS.dagw.report.busArrival.view,
          title: 'Daily Report',
        },
        component: DAGWBusArrivalExceptionListComponent,
        // children: [
        //   {
        //     path: dagwRoutes?.report?.busArrival,
        //     component: DAGWBusArrivalExceptionListComponent,
        //   },
        // ],
      },
      {
        path: '',
        component: MaintenanceComponent,
        children: [
          {
            path: mdcsRoutes?.maintenance?.diagnostics,
            component: DiagnosticsComponent,
            canActivate: [RoleGuard],
            data: {
              roles: MENU_ACCESS.dagw.maintenance.diagnostics.view,
              title: 'Diagnostics',
            },
          },
          {
            path: mdcsRoutes?.maintenance?.systemInformation,
            component: SystemInformationComponent,
            canActivate: [RoleGuard],
            data: {
              roles: MENU_ACCESS.dagw.maintenance.systemInformation.view,
              title: 'System Information',
            },
          },
        ],
      },
      // {
      //   path: dagwRoutes?.maintenance?.diagnostics,
      //   component: DiagnosticsComponent,
      //   canActivate: [RoleGuard],
      //   data: {
      //     roles: MENU_ACCESS.dagw.maintenance.diagnostics.view,
      //     title: 'Diagnostics',
      //   },
      // },
      // {
      //   path: dagwRoutes?.maintenance?.systemInformation,
      //   component: SystemInformationComponent,
      //   canActivate: [RoleGuard],
      //   data: {
      //     roles: MENU_ACCESS.dagw.maintenance.systemInformation.view,
      //     title: 'System Information',
      //   },
      // },
      {
        path: dagwRoutes?.notification,
        component: NotificationListComponent,
      },
    ],
  },
];

export { mdcsRoutes, dagwRoutes };
