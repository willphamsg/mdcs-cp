import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidatorFn,
} from '@angular/forms';
import { IDepoList } from '@app/models/depo';

export interface IFilterConfig {
  controlName: string;
  value?: any;
  type?:
    | 'control'
    | 'array'
    | 'group'
    | 'select'
    | 'radio'
    | 'date-field'
    | 'date-range'
    | 'date-picker';
  validators?: ValidatorFn[];
  children?: IFilterConfig[];
  options?: any[];
}

export interface IValidatorConfig {
  [key: string]: ValidatorFn[];
}

export const createFormGroup = (configs: IFilterConfig[]): FormGroup => {
  const formGroup: { [key: string]: FormControl | FormArray | FormGroup } = {};

  configs.forEach(config => {
    if (config.type === 'array' && config.options) {
      formGroup[config.controlName] = new FormArray(
        config.options.map(() => new FormControl(false))
      );
    } else if (config.type === 'group' && config.children) {
      formGroup[config.controlName] = createFormGroup(config.children);
    } else if (config.type === 'date-range') {
      formGroup[config.controlName] = new FormGroup({
        startDate: new FormControl(null),
        endDate: new FormControl(null),
      });
    } else {
      formGroup[config.controlName] = new FormControl(
        config.value || '',
        config.validators || []
      );
    }
  });

  return new FormBuilder().group(formGroup);
};

export const setFormValidators = (
  formGroup: FormGroup,
  validatorConfig: IValidatorConfig
): void => {
  Object.keys(validatorConfig).forEach(controlName => {
    const control = formGroup.get(controlName) as FormControl;

    if (control) {
      control.setValidators(validatorConfig[controlName]);

      control.updateValueAndValidity();
    }
  });
};

export const removeValidator = (
  control: AbstractControl,
  key?: string
): void => {
  if (control instanceof FormGroup) {
    if (key) {
      const formControl = control.get(key);
      if (formControl) {
        formControl.clearValidators();
        formControl.updateValueAndValidity();
      }
    } else {
      Object.keys(control.controls).forEach(ctrlName => {
        removeValidator(control.controls[ctrlName]);
      });
    }
  }
};

export const getSelectedValuesFromFormArray = (
  formGroup: FormGroup,
  formArrayName: string,
  options?: any[]
): { selectedValues: string; selectedIds: string[] } => {
  const formArray = formGroup.get(formArrayName) as FormArray;
  let selectedValues: string[] = [];
  let selectedIds: string[] = [];

  selectedValues = formArray.controls
    .map((control, index) => (control.value ? options?.[index].value : null))
    .filter(value => value !== null) as string[];

  selectedIds = formArray.controls
    .map((control, index) => (control.value ? options?.[index].id : null))
    .filter(id => id !== null) as string[];

  return {
    selectedValues: selectedValues.join(', '),
    selectedIds,
  };
};

export const getSelectedDepotValues = (
  formGroup: FormGroup,
  formGroupName: string,
  displayKey: keyof IDepoList,
  dataList: IDepoList[]
): { selectedValues: string; selectedIds: string[] } => {
  const selectedGroup = formGroup.get(formGroupName) as FormGroup;
  const depotMap: { [key: string]: IDepoList } = dataList.reduce(
    (acc, depot, index) => {
      acc[index] = depot;
      return acc;
    },
    {} as { [key: string]: IDepoList }
  );

  const selectedValues: string[] = [];
  const selectedIds: string[] = [];

  Object.keys(selectedGroup.controls)
    .filter(key => selectedGroup.get(key)?.value)
    .forEach(key => {
      const selectedDepot = depotMap[key];
      if (selectedDepot) {
        selectedValues.push(String(selectedDepot[displayKey]));
        // selectedIds.push(String(selectedDepot.depot_id));
        selectedIds.push(selectedDepot.depot_id);
      }
    });

  return {
    selectedValues: selectedValues.join(', '),
    selectedIds,
  };
};

export const isDateRangeControl = (
  control: AbstractControl | null
): boolean => {
  return (
    control &&
    control.value &&
    control.value.startDate !== undefined &&
    control.value.endDate !== undefined
  );
};

export const getDateRangeValue = (
  control: AbstractControl | null
): {
  startDate: Date | null;
  endDate: Date | null;
} => {
  const dateRange = control?.value;
  return {
    startDate: dateRange?.startDate || null,
    endDate: dateRange?.endDate || null,
  };
};

export const getSelectedValuesFromRadioGroup = (
  formGroup: FormGroup,
  controlName: string,
  options?: any[]
): { selectedValue: string; selectedId: string } => {
  const control = formGroup.get(controlName) as FormControl;
  const selectedValue = control?.value;
  // console.log('Selected Radio Value:', selectedValue);

  if (!selectedValue || !options) {
    return { selectedValue: '', selectedId: '' };
  }

  const matched = options.find(option => option.value === selectedValue);
  // console.log('Matched Radio Option:', matched);
  return {
    selectedValue: matched?.value ?? '',
    selectedId: matched?.id ?? '',
  };
};
