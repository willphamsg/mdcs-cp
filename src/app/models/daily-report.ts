export interface ReportType {
  id: number;
  label: string;
}

export interface IReportList {
  busNum: string;
  serviceNum: string;
  estArrivalTime: string;
  estReturnNum: number;
  actualReturnNum: number;
  updateCount: number;
  svcProvId: number;
  busListEntry: number;
  exceptionReason: string;
  businessDay: string;
  chk?: boolean;
  id?: string | number;
  depot_name?: string;
  report_type?: string;
  business_date?: string;
}
