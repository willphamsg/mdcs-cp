export interface PayloadResponse {
  status: number;
  status_code: string;
  timestamp: number;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}

export interface PayloadRequest {
  page_size: number;
  page_index: number;
  sort_order: Sort[];
  parameters: Parameters;
}

export interface BusRequest {
  page_size: number;
  search_text?: string;
  page_index: number;
  sort_order: Sort[];
  day_type: string;
  bus_num: string;
  svc_prov_id: string;
  depot_id: string;
  status?: string;
  trial_group?: string;
}

export interface BusTransferRequest {
  page_size: number;
  page_index: number;
  sort_order: Sort[];
  search_text: string;
  search_select_filter: BusTransferSearchFilter;
}

export interface BusTransferSearchFilter {
  status: string[];
  current_depot: string[];
  current_operator: string[];
  future_operator: string[];
}

export interface VehicleRequest {
  page_size: number;
  page_index: number;
  sort_order: Sort[];
  search_text?: string;
  bus_num: string;
  effective_date: string;
  depot_id: string;
  status_type?: string;
}

export interface DailyReportRequest {
  page_size: number;
  page_index: number;
  sort_order: Sort[];
  report_type: string;
  business_date: string;
  depot_id: string;
}

export interface DAGWDailyReportRequest {
  business_day: string;
  depot: number;
  svc_Provider_Id: number;
}

export interface BusOperationRequest {
  patternSearch: boolean;
  search_text: string;
  is_pattern_search: boolean;
  page_size: number;
  page_index: number;
  sort_order: SortOrder[];
}

export interface Sort {
  name: string;
  desc: boolean;
}

export interface Parameters {
  additionalProp1: AdditionalProp;
  additionalProp2: AdditionalProp;
  additionalProp3: AdditionalProp;
}

export interface AdditionalProp {}

export interface DepoRequest {
  patternSearch: boolean;
  search_text: string;
  is_pattern_search: boolean;
  page_size: number;
  page_index: number;
  sort_order: SortOrder[];
}

export interface SortOrder {
  name: string;
  desc: boolean;
}

export interface DropdownList {
  id: string;
  value: string;
}

export interface IHeader {
  chk: boolean;
  field: string;
  name: string;
  hidden: boolean;
}

export interface IHeaderGeneral {
  field: string;
  name: string;
}

export type TFilter = string | string[] | TDate | number | number[];
export type TDate = { startDate: string; endDate: string };

export interface IParams {
  page_size: number;
  page_index: number;
  sort_order: Array<{ name: string; desc: boolean }>;
  search_text: string | null;
  search_select_filter: {
    [key: string]: TFilter;
  };
}

export interface IActionHistoryParams {
  search_select_filter: {
    [key: string]: TFilter;
  };
  search_text?: string | null;
  param_master_ids?: number[];
  sort_order?: Array<{ name: string; desc: boolean }>;
}
export interface IOperatorList {
  id: number;
  version?: number;
  svc_prov_id: number;
  svc_prov_code: string;
  svc_prov_name: string;
  search_text?: string;
  search_select_filter?: { [key: string]: string[] | string };
}

export interface IPaginationEvent {
  page: number;
  pageSize: number;
}

export interface IColumnDefinition<T> {
  columnDef: string;
  header: string;
  cell: (element: T) => string;
}

export interface IReportParameter {
  spid: string | null;
  businessday: string | null;
  depotid: string | null;
  month?: string | null;
  currenteffectivedatetime?: string | null;
  futureeffectivedatetime?: string | null;
  currentspid?: string | null;
  futurespid?: string | null;
}

export interface IReportViewerOption {
  showparameter: 'true' | 'false';
  toolbar: 'true' | 'false';
}
