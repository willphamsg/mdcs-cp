export interface IAdhocReport {
  chk: boolean;
  id: number;
  depot_name: string;
  report_type: string;
  service_provider_name: string;
  current_operator: string;
  future_operator: string;
  start_date: string;
  end_date: string;
  month_type: string;
  tab_filter: string;
}
