export const MENU_ACCESS = {
  mdcs: {
    dashboard: {
      home: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      depotOverView: {
        view: ['adm', 'sup', 'ope', 'mai'],
        manage: ['sup'],
      },
    },
    user: {
      view: ['adm', 'mai'],
      manage: ['adm', 'mai'],
    },
    monitoring: {
      busOperation: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      cardKeyVersion: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
    },
    bus: {
      busExpList: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      busList: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      vehicleList: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      busTransfer: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
    },
    report: {
      dailyReport: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      adhoc: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
    },
    parameterManagement: {
      dagwParameter: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      parameterViewer: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      importParameter: {
        view: ['mai'],
        manage: ['mai'],
      },
      exportParameter: {
        view: ['mai'],
        manage: ['mai'],
      },
    },
    maintenance: {
      diagnostics: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      eodProcess: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      auditLog: {
        view: ['adm', 'sup'],
        manage: ['adm', 'sup'],
      },
      systemInformation: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
    },
    parameterTrial: {
      approval: {
        view: ['sup'],
        manage: ['sup'],
      },
      parameterMode: {
        view: ['sup'],
        manage: ['sup'],
      },
      trialDeviceSelection: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      parameterVersionSummary: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      endTrial: {
        view: ['sup'],
        manage: ['sup'],
      },
    },
    changePassword: {
      view: ['adm', 'sup', 'ope', 'mai'],
      manage: ['adm', 'sup', 'ope', 'mai'],
    },
    eventHistory: {
      view: ['sup', 'ope'],
      manage: ['sup'],
    },
  },
  dagw: {
    // dashboard: {
    //   view: ['sup', 'ope'],
    //   manage: ['sup'],
    // },
    user: {
      view: ['adm', 'mai'],
      manage: ['adm', 'mai'],
    },
    monitoring: {
      busOperation: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
    },
    bus: {
      vehicleList: {
        view: ['sup', 'ope'],
        manage: [],
      },
    },
    report: {
      busArrival: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
    },
    parameterManagement: {
      dagwParameter: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      importParameter: {
        view: ['mai'],
        manage: ['mai'],
      },
      exportParameter: {
        view: ['mai'],
        manage: ['mai'],
      },
    },
    messageDataManagement: {
      messageDataImport: {
        view: ['mai'],
        manage: ['mai'],
      },
      messageDataExport: {
        view: ['mai'],
        manage: ['mai'],
      },
    },
    parameterTrial: {
      trialDeviceSelection: {
        view: ['sup', 'ope'],
        manage: [],
      },
    },
    maintenance: {
      diagnostics: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
      systemInformation: {
        view: ['sup', 'ope'],
        manage: ['sup'],
      },
    },
    changePassword: {
      view: ['adm', 'sup', 'ope', 'mai'],
      manage: ['adm', 'sup', 'ope', 'mai'],
    },
  },
};
