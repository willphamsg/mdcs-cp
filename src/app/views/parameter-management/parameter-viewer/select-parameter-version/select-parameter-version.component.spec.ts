import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectParameterVersionComponent } from './select-parameter-version.component';
import { IParameterMultipleVersion, IParameterViewDetails } from '@app/models/parameter-management';

describe('SelectParameterVersionComponent', () => {
  let component: SelectParameterVersionComponent;
  let fixture: ComponentFixture<SelectParameterVersionComponent>;

  const versionDepot1A: IParameterMultipleVersion = {
    id: 1,
    parameter_name: 'ParamA',
    depot_id: 1,
  };
  const versionDepot1B: IParameterMultipleVersion = {
    id: 2,
    parameter_name: 'ParamB',
    depot_id: 1,
  };
  const versionDepot2A: IParameterMultipleVersion = {
    id: 3,
    parameter_name: 'ParamC',
    depot_id: 2,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectParameterVersionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectParameterVersionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('checkMultiVersion - single version mode', () => {
    it('should filter versions by depot and select the matching version when found', () => {
      component.parameterMultipleVersion = [versionDepot1A, versionDepot1B, versionDepot2A];
      component.depotSelected = '1';
      component.parameterVersionSelected = { id: 2, parameter_name: 'ParamB' } as IParameterViewDetails;
      component.isMultipleVersion = false;

      component.checkMultiVersion();

      expect(component.parameterMultipleVersionRadio).toEqual([versionDepot1A, versionDepot1B]);
      expect(component.parameterVersionSelected).toBe(versionDepot1B);
    });

    it('should fall back to parameterVersionSelected when no versions match the selected depot', () => {
      const selected = { id: 99, parameter_name: 'Other' } as IParameterViewDetails;
      component.parameterMultipleVersion = [versionDepot2A];
      component.depotSelected = '1';
      component.parameterVersionSelected = selected;
      component.isMultipleVersion = false;

      component.checkMultiVersion();

      expect(component.parameterMultipleVersionRadio).toEqual([selected]);
      expect(component.parameterVersionSelected).toBe(selected);
    });

    it('should fall back to the first radio option when the selected id has no match', () => {
      component.parameterMultipleVersion = [versionDepot1A, versionDepot1B];
      component.depotSelected = '1';
      component.parameterVersionSelected = { id: 999, parameter_name: 'NoMatch' } as IParameterViewDetails;
      component.isMultipleVersion = false;

      component.checkMultiVersion();

      expect(component.parameterVersionSelected).toBe(versionDepot1A as any);
    });

    it('should fall back to the first radio option when parameterVersionSelected is undefined', () => {
      component.parameterMultipleVersion = [versionDepot1A, versionDepot1B];
      component.depotSelected = '1';
      component.parameterVersionSelected = undefined as any;
      component.isMultipleVersion = false;

      component.checkMultiVersion();

      expect(component.parameterVersionSelected).toBe(versionDepot1A as any);
    });
  });

  describe('checkMultiVersion - multi version mode', () => {
    it('should use the full version list and select the matching version when found', () => {
      component.parameterMultipleVersion = [versionDepot1A, versionDepot1B, versionDepot2A];
      component.parameterVersionSelected = { id: 3, parameter_name: 'ParamC' } as IParameterViewDetails;
      component.isMultipleVersion = true;

      component.checkMultiVersion();

      expect(component.parameterMultipleVersionRadio).toEqual([versionDepot1A, versionDepot1B, versionDepot2A]);
      expect(component.parameterVersionSelected).toBe(versionDepot2A);
    });

    it('should fall back to the first entry when no matching id is found', () => {
      component.parameterMultipleVersion = [versionDepot1A, versionDepot1B];
      component.parameterVersionSelected = { id: 999, parameter_name: 'NoMatch' } as IParameterViewDetails;
      component.isMultipleVersion = true;

      component.checkMultiVersion();

      expect(component.parameterVersionSelected).toBe(versionDepot1A as any);
    });

    it('should fall back to the first entry when parameterVersionSelected is undefined', () => {
      component.parameterMultipleVersion = [versionDepot1A, versionDepot1B];
      component.parameterVersionSelected = undefined as any;
      component.isMultipleVersion = true;

      component.checkMultiVersion();

      expect(component.parameterVersionSelected).toBe(versionDepot1A as any);
    });
  });

  describe('ngOnChanges', () => {
    it('should invoke checkMultiVersion', () => {
      spyOn(component, 'checkMultiVersion');

      component.ngOnChanges({});

      expect(component.checkMultiVersion).toHaveBeenCalled();
    });

    it('should update parameterMultipleVersionRadio when inputs change', () => {
      component.parameterMultipleVersion = [versionDepot1A, versionDepot2A];
      component.depotSelected = '2';
      component.parameterVersionSelected = { id: 3, parameter_name: 'ParamC' } as IParameterViewDetails;
      component.isMultipleVersion = false;

      component.ngOnChanges({});

      expect(component.parameterMultipleVersionRadio).toEqual([versionDepot2A]);
    });
  });

  describe('emitSelectedVersion', () => {
    it('should emit the currently selected version', () => {
      const selected = { id: 1, parameter_name: 'ParamA' } as IParameterViewDetails;
      component.parameterVersionSelected = selected;
      spyOn(component.versionEmitted, 'emit');

      component.emitSelectedVersion();

      expect(component.versionEmitted.emit).toHaveBeenCalledWith(selected);
    });
  });

  describe('replaceQuestionMark', () => {
    it('should replace the "?." token with each provided replacement', () => {
      const result = component.replaceQuestionMark('field?.value', ['a', 'b', 'c']);

      expect(result).toEqual(['fieldavalue', 'fieldbvalue', 'fieldcvalue']);
    });

    it('should return the input unchanged when there is no "?." token', () => {
      const result = component.replaceQuestionMark('plainField', ['x', 'y']);

      expect(result).toEqual(['plainField', 'plainField']);
    });

    it('should return an empty array when replacements is empty', () => {
      const result = component.replaceQuestionMark('field?.value', []);

      expect(result).toEqual([]);
    });
  });
});
