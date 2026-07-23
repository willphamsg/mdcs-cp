export interface UserView {
  status: number;
  timestamp: number;
  status_code: string;
  message: string;
  message_code: string;
  payload: Payload;
}

export interface Payload {
  pagination: Pagination;
  user_list: UserList[];
}

export interface Pagination {
  size: number;
  page: number;
  sorts: Sort[];
  parameters: Parameters;
}

export interface Sort {
  name: string;
  desc: boolean;
}

export interface Parameters {
  additionalProp1: AdditionalProp1;
  additionalProp2: AdditionalProp2;
  additionalProp3: AdditionalProp3;
}

export interface AdditionalProp1 {}

export interface AdditionalProp2 {}

export interface AdditionalProp3 {}

export interface UserList {
  id: number;
  version: number;
  email: string;
  preferred_name: string;
  depot: Depot;
  org: Org;
  role: Role;
}

export interface Depot {
  id: number;
  version: number;
  code: string;
  name: string;
}

export interface Org {
  id: number;
  version: number;
  code: string;
  name: string;
  authorized: boolean;
}

export interface Role {
  id: number;
  version: number;
  code: string;
  name: string;
}
