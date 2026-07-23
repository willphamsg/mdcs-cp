const express = require('express');
const cors = require('cors');

const busRoutes = require('./routes/bus.routes');
const dailyBusRoutes = require('./routes/daily-bus-list.routes');
const diagnosticRoutes = require('./routes/diagnostics.routes');
const eodProcessRoutes = require('./routes/eod-process.routes');
const auditTrailLogRoutes = require('./routes/audit-trail-log.routes');
const systemInfoRoutes = require('./routes/system-info.routes');
const cardKeyVersionRoutes = require('./routes/card-key-version.routes');
const operationalBusListRoutes = require('./routes/operational-bus-list.routes');
const busOperationStatusRoutes = require('./routes/bus-operation-status.routes');
const masterBusListRoutes = require('./routes/master-bus-list.routes');
const dagwParamVersionSummaryRoutes = require('./routes/dagw-param-version-summary.routes');
const parameterRoutes = require('./routes/parameter.routes');
const parameterImportExportRoutes = require('./routes/parameter-import-export.routes');
const messageImportExportRoutes = require('./routes/message-import-export.routes');
const generalInformationRoutes = require('./routes/general-information.routes');
const depotRoutes = require('./routes/depot.routes');
const commonRoutes = require('./routes/common.routes');
const settingsRoutes = require('./routes/settings.routes');
const parameterViewerRoutes = require('./routes/parameter-viewer.routes');
const reportRoutes = require('./routes/report.routes');

const app = express();

app.locals.EOD_PROCESS_COUNT = 0;
app.locals.PARAMETER_FILE_IMPORT_COUNT = 0;
app.locals.PARAMETER_FILE_EXPORT_COUNT = 0;
app.locals.PARAMETER_FILE_EXPORT = [];
app.locals.PARAMETER_MODE_LIVE_TRIAL_COUNT = 0;
app.locals.PARAMETER_MODE_LIVE_LIST = [];
app.locals.PARAMETER_MODE_TRIAL_LIST = [];

app.use(cors());

app.use(express.json());

// Routes
app.use('/bus/api', busRoutes);
app.use('/bus/api/daily-bus-list', dailyBusRoutes);
app.use('/bus/api/master-bus-list', masterBusListRoutes);
app.use('/bus/api/diagnostics', diagnosticRoutes);
app.use('/api/eod-process', eodProcessRoutes);
app.use('/common/api/audit-trail-log', auditTrailLogRoutes);
app.use('/common/api/system-info', systemInfoRoutes);
app.use('/api/operational-bus-list', operationalBusListRoutes);
app.use('/bus/api/bus-operation-status', busOperationStatusRoutes);
app.use('/bus/api/card-key-version-summary', cardKeyVersionRoutes);
app.use('/api/dagw-param-version-summary', dagwParamVersionSummaryRoutes);
app.use('/param/api', parameterRoutes);
app.use('/param/api/param', parameterImportExportRoutes);
app.use('/api/message-data', messageImportExportRoutes);
app.use('/api/general-information', generalInformationRoutes);
app.use('/api/depot', depotRoutes);
app.use('/common/api', commonRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/param/api/parameter/view', parameterViewerRoutes);
app.use('/report/api', reportRoutes);
app.use('/system', settingsRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
