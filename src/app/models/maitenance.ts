export interface IStatusCategory {
  category: string;
  items: IStatusItem[];
}

interface IStatusItem {
  name: string;
  status: string;
  lastUpdate: string;
}

export interface IEodProcess {
  taskName: string;
  description: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface IEodDates {
  current_business_day: string;
  last_eod: string;
}

export interface IAudtitLog {
  id: string;
  depot: string;
  userId: string;
  dateTime: string;
  startDate: string;
  endDate: string;
  updateType: string;
  description: string;
}

export interface IUpdateType {
  [key: string]: string;
}

export interface ISystemInfo {
  sectionName: string;
  details: { label: string; value: string | string[] }[];
}
