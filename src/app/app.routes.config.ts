export const mdcsRoutes = {
  dashboard: {
    home: 'dashboard',
    depotOverView: 'dashboard/:id',
  },
  user: 'user',
  monitoring: {
    busOperation: 'bus-operation',
    cardKeyVersion: 'card-key-version',
  },
  bus: {
    busExpList: 'bus-exception-list',
    busList: 'bus-list',
    vehicleList: 'vehicle-list',
    busTransfer: 'bus-transfer',
  },
  report: {
    dailyReport: {
      url: 'report/daily-report',
      // allDailyReport: 'report/daily-report/all-daily-report',
      busArrival: 'report/daily-report/bus-arrival-exception-list',
      busAuditTrial: 'report/daily-report/bus-list-audit-trial',
      busPartialUploadReport: 'report/daily-report/bus-partial-upload-report',
      busTransferReport: 'report/daily-report/bus-transfer-report',
      dailyBusListReport: 'report/daily-report/daily-bus-list-report',
      dagwMonthlyReport: 'report/daily-report/dagw-monthly-availability-report',
    },
    adhoc: {
      url: 'report/adhoc',
      busArrival: 'report/adhoc/bus-arrival-exception-list',
      busAuditTrial: 'report/adhoc/bus-list-audit-trial',
      busPartialUploadReport: 'report/adhoc/bus-partial-upload-report',
      busTransferReport: 'report/adhoc/bus-transfer-report',
      dailyBusListReport: 'report/adhoc/daily-bus-list-report',
      dagwMonthlyReport: 'report/adhoc/dagw-monthly-availability-report',
    },
  },
  parameterManagement: {
    url: 'parameter-management',
    dagwParameter: 'dagw-parameter',
    parameterViewer: 'parameter-viewer',
    importParameter: 'import-parameter',
    exportParameter: 'export-parameter',
  },
  maintenance: {
    url: 'maintenance',
    diagnostics: 'maintenance/diagnostics',
    eodProcess: 'maintenance/eod-process',
    auditLog: 'maintenance/audit-log',
    systemInformation: 'maintenance/system-information',
  },
  parameterTrial: {
    url: 'parameter-trial',
    approval: 'parameter-trial/approval',
    parameterMode: 'parameter-trial/parameter-mode',
    trialDeviceSelection: 'parameter-trial/trial-device-selection',
    parameterVersionSummary: 'parameter-trial/parameter-version-summary',
    endTrial: 'parameter-trial/end-trial',
  },
  notification: 'notification-centre',
  changePassword: 'change-password',
  eventHistory: 'event-history',
};

export const dagwRoutes = {
  user: 'user',
  monitoring: {
    busOperation: 'bus-operation',
  },
  bus: {
    vehicleList: 'vehicle-list',
  },
  report: {
    busArrival: 'report/daily-report/bus-arrival-exception-list',
  },
  parameterManagement: {
    url: 'parameter-management',
    dagwParameter: 'dagw-parameter',
    importParameter: 'import-parameter',
    exportParameter: 'export-parameter',
  },
  messageDataManagement: {
    messageFileImport: 'message-file-import',
    messageFileExport: 'message-file-export',
  },
  maintenance: {
    url: 'maintenance',
    diagnostics: 'maintenance/diagnostics',
    systemInformation: 'maintenance/system-information',
  },
  parameterTrial: {
    url: 'parameter-trial',
    trialDeviceSelection: 'parameter-trial/trial-device-selection',
  },
  notification: 'notification-centre',
  changePassword: 'change-password',
  eventHistory: 'event-history',
};
