import { DropdownList } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { IFilterConfig } from '@app/shared/utils/form-utils';

export const loadFilterValues = (
  depots: IDepoList[],
  reportTypes: DropdownList[],
  serviceProvideList: DropdownList[]
): IFilterConfig[] => {
  return [
    {
      controlName: 'currDepot',
      value: '',
      type: 'select',
      options: depots,
    },
    {
      controlName: 'currOperator',
      value: '',
      type: 'select',
    },
    {
      controlName: 'futureOperator',
      value: '',
      type: 'select',
    },
    {
      controlName: 'startDate',
      value: '',
      type: 'date-field',
    },
    {
      controlName: 'endDate',
      value: '',
      type: 'date-field',
    },
    {
      controlName: 'reportType',
      value: [],
      type: 'array',
      options: reportTypes,
    },
    {
      controlName: 'depots',
      value: [],
      type: 'array',
      options: depots,
    },
    {
      controlName: 'serviceProvider',
      value: [],
      type: 'array',
      options: serviceProvideList,
    },
    {
      controlName: 'monthType',
      value: '',
      type: 'date-picker',
    },
  ];
};

export const defaultFilterValues = (
  depots: IDepoList[],
  reportTypes: DropdownList[],
  serviceProvideList: DropdownList[]
): IFilterConfig[] => {
  return [
    {
      controlName: 'reportType',
      value: [],
      type: 'array',
      options: reportTypes,
    },
    {
      controlName: 'depots',
      value: [],
      type: 'array',
      options: depots,
    },
    {
      controlName: 'serviceProvider',
      value: [],
      type: 'array',
      options: serviceProvideList,
    },
  ];
};

export const reusableFilterValues = (
  depots: IDepoList[],
  serviceProvideList: DropdownList[]
): IFilterConfig[] => {
  return [
    {
      controlName: 'depots',
      value: [],
      type: 'array',
      options: depots,
    },
    {
      controlName: 'serviceProvider',
      value: [],
      type: 'array',
      options: serviceProvideList,
    },
  ];
};

export const dagwFilterValues = (depots: IDepoList[]): IFilterConfig[] => {
  return [
    {
      controlName: 'depots',
      value: [],
      type: 'array',
      options: depots,
    },
    {
      controlName: 'monthType',
      value: '',
      type: 'date-field',
    },
  ];
};

export const busTransferFilterValues = (
  depots: IDepoList[]
): IFilterConfig[] => {
  return [
    {
      controlName: 'currDepot',
      value: '',
      type: 'select',
      options: depots,
    },
    {
      controlName: 'currOperator',
      value: '',
      type: 'select',
    },
    {
      controlName: 'futureOperator',
      value: '',
      type: 'select',
    },
    {
      controlName: 'startDate',
      value: '',
      type: 'date-field',
    },
    {
      controlName: 'endDate',
      value: '',
      type: 'date-field',
    },
  ];
};
