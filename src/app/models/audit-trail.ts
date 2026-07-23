export interface IAuditTrail {
  depot: string;
  userId: string;
  dateTime: string;
  startDate: string;
  endDate: string;
  update_type: string;
  description: string;
}
