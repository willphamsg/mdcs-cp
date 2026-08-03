import { FormArray, FormControl, FormGroup } from '@angular/forms';
import {
  createFormGroup,
  getDateRangeValue,
  getSelectedDepotValues,
  getSelectedValuesFromRadioGroup,
  isDateRangeControl,
  removeValidator,
} from './form-utils';

describe('form-utils', () => {
  describe('createFormGroup', () => {
    it('creates a nested FormGroup with startDate/endDate controls for a date-range config', () => {
      const group = createFormGroup([
        { controlName: 'range', type: 'date-range' },
      ]);

      const rangeGroup = group.get('range') as FormGroup;
      expect(rangeGroup instanceof FormGroup).toBeTrue();
      expect(rangeGroup.get('startDate')).toBeInstanceOf(FormControl);
      expect(rangeGroup.get('endDate')).toBeInstanceOf(FormControl);
    });
  });

  describe('removeValidator', () => {
    it('does nothing when called on a plain FormControl (not a FormGroup)', () => {
      const control = new FormControl('value', [() => null]);

      expect(() => removeValidator(control)).not.toThrow();
      expect(control.validator).not.toBeNull();
    });

    it('recurses into child FormGroups without throwing when no key is given', () => {
      // The recursive call never forwards a `key`, so a plain FormControl
      // leaf is only ever visited via the `instanceof FormGroup` check
      // (which is false for it) and its validators are left untouched -
      // this exercises the recursion branch itself, not validator clearing.
      const group = new FormGroup({
        nested: new FormGroup({
          a: new FormControl('a', [() => ({ invalid: true })]),
        }),
      });

      expect(() => removeValidator(group)).not.toThrow();
      expect((group.get('nested') as FormGroup).get('a')?.validator).not.toBeNull();
    });

    it('does nothing when the given key does not exist on the group', () => {
      const group = new FormGroup({ a: new FormControl('a') });

      expect(() => removeValidator(group, 'missing')).not.toThrow();
    });
  });

  describe('getSelectedDepotValues', () => {
    it('falls back to an empty display value when the depot field is neither string nor number', () => {
      const group = new FormGroup({
        depots: new FormGroup({ '0': new FormControl(true) }),
      });

      const result = getSelectedDepotValues(group, 'depots', 'depot_list' as any, [
        { depot_id: '1', depot_list: [{ nested: true }] } as any,
      ]);

      expect(result.selectedValues).toBe('');
      expect(result.selectedIds).toEqual(['1']);
    });

    it('joins string depot display values and collects their ids', () => {
      const group = new FormGroup({
        depots: new FormGroup({ '0': new FormControl(true) }),
      });

      const result = getSelectedDepotValues(group, 'depots', 'depot_name' as any, [
        { depot_id: '1', depot_name: 'Depot A' } as any,
      ]);

      expect(result.selectedValues).toBe('Depot A');
      expect(result.selectedIds).toEqual(['1']);
    });
  });

  describe('isDateRangeControl', () => {
    it('returns false for a null control', () => {
      expect(isDateRangeControl(null)).toBeFalse();
    });

    it('returns false when the control value has no startDate/endDate', () => {
      expect(isDateRangeControl(new FormControl({ foo: 'bar' }))).toBeFalse();
    });

    it('returns true when the control value has both startDate and endDate', () => {
      const control = new FormControl({ startDate: new Date(), endDate: new Date() });
      expect(isDateRangeControl(control)).toBeTrue();
    });
  });

  describe('getDateRangeValue', () => {
    it('returns null start/end for a null control', () => {
      expect(getDateRangeValue(null)).toEqual({ startDate: null, endDate: null });
    });

    it('returns the start/end dates when present on the control value', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const control = new FormControl({ startDate: start, endDate: end });

      expect(getDateRangeValue(control)).toEqual({ startDate: start, endDate: end });
    });
  });

  describe('getSelectedValuesFromRadioGroup', () => {
    it('returns empty values when nothing is selected', () => {
      const group = new FormGroup({ choice: new FormControl(null) });

      const result = getSelectedValuesFromRadioGroup(group, 'choice', [
        { value: '1', id: 'a', label: 'A' },
      ]);

      expect(result).toEqual({ selectedValue: '', selectedId: '' });
    });

    it('returns empty values when a value is selected but no options are provided', () => {
      const group = new FormGroup({ choice: new FormControl('1') });

      const result = getSelectedValuesFromRadioGroup(group, 'choice');

      expect(result).toEqual({ selectedValue: '', selectedId: '' });
    });

    it('falls back to empty strings when the selected value matches no option', () => {
      const group = new FormGroup({ choice: new FormControl('missing') });

      const result = getSelectedValuesFromRadioGroup(group, 'choice', [
        { value: '1', id: 'a' },
      ]);

      expect(result).toEqual({ selectedValue: '', selectedId: '' });
    });

    it('returns the matched option value and id', () => {
      const group = new FormGroup({ choice: new FormControl('1') });

      const result = getSelectedValuesFromRadioGroup(group, 'choice', [
        { value: '1', id: 'a' },
      ]);

      expect(result).toEqual({ selectedValue: '1', selectedId: 'a' });
    });
  });
});
