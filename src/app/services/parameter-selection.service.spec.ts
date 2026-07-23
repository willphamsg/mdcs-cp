import { TestBed } from '@angular/core/testing';
import { ParameterSelectionService } from './parameter-selection.service';
import {
  INewParameterApproval,
  IParameterMode,
  IEndTrial,
  ITrialDeviceSelection,
} from '@models/parameter-trial';

describe('ParameterSelectionService', () => {
  let service: ParameterSelectionService;

  const mockApproval: INewParameterApproval = {
    chk: false,
    id: 1,
    version: 1,
    depot_id: 'D1',
    depot_name: 'Depot 1',
    parameter_name: 'Param1',
    parameter_version: 'v1',
    status_code: 200,
    last_update: '2024-01-01',
  };

  const mockParameterMode: IParameterMode = {
    chk: false,
    id: 1,
    version: 1,
    depot_id: 'D1',
    depot_name: 'Depot 1',
    parameter_name: 'Param1',
    parameter_version: 'v1',
  };

  const mockEndTrial: IEndTrial = {
    chk: false,
    id: 1,
    version: 1,
    depot_id: 'D1',
    depot_name: 'Depot 1',
    parameter_name: 'Param1',
    parameter_version: 'v1',
  };

  const mockTrialDevice: ITrialDeviceSelection = {
    chk: false,
    id: 1,
    depot_id: 1,
    depot: {},
    bus_num: 'BUS001',
    svc_provider_id: 1,
    trial_group: false,
    service_group: false,
    parameter_group: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ParameterSelectionService],
    });
    service = TestBed.inject(ParameterSelectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // New Parameter Approval tests
  describe('New Parameter Approval selections', () => {
    it('should add and get selection', () => {
      service.addSelection(mockApproval);
      expect(service.getSelections()).toHaveSize(1);
    });

    it('should remove selection', () => {
      service.addSelection(mockApproval);
      service.removeSelection(mockApproval.id);
      expect(service.getSelections()).toHaveSize(0);
    });

    it('should toggle selection on', () => {
      service.toggleSelection(mockApproval, true);
      expect(service.isSelected(mockApproval.id)).toBeTrue();
    });

    it('should toggle selection off', () => {
      service.addSelection(mockApproval);
      service.toggleSelection(mockApproval, false);
      expect(service.isSelected(mockApproval.id)).toBeFalse();
    });

    it('should add multiple selections', () => {
      const item2 = { ...mockApproval, id: 2 };
      service.addMultipleSelections([mockApproval, item2]);
      expect(service.getSelectionCount()).toBe(2);
    });

    it('should remove multiple selections', () => {
      const item2 = { ...mockApproval, id: 2 };
      service.addMultipleSelections([mockApproval, item2]);
      service.removeMultipleSelections(['1', '2']);
      expect(service.getSelectionCount()).toBe(0);
    });

    it('should clear selections', () => {
      service.addSelection(mockApproval);
      service.clearSelections();
      expect(service.getSelectionCount()).toBe(0);
    });

    it('should emit selection changes', (done) => {
      service.selection$.subscribe(selections => {
        if (selections.length === 1) {
          expect(selections[0].id).toBe(mockApproval.id);
          done();
        }
      });
      service.addSelection(mockApproval);
    });
  });

  // Parameter Mode tests
  describe('Parameter Mode selections', () => {
    it('should add and get parameter mode selection', () => {
      service.addParameterModeSelection(mockParameterMode);
      expect(service.getParameterModeSelections()).toHaveSize(1);
    });

    it('should toggle parameter mode selection', () => {
      service.toggleParameterModeSelection(mockParameterMode, true);
      expect(service.isParameterModeSelected(mockParameterMode.id)).toBeTrue();
    });

    it('should clear parameter mode selections', () => {
      service.addParameterModeSelection(mockParameterMode);
      service.clearParameterModeSelections();
      expect(service.getParameterModeSelections()).toHaveSize(0);
    });
  });

  // End Trial tests
  describe('End Trial selections', () => {
    it('should add and get end trial selection', () => {
      service.addEndTrialSelection(mockEndTrial);
      expect(service.getEndTrialSelections()).toHaveSize(1);
    });

    it('should toggle end trial selection', () => {
      service.toggleEndTrialSelection(mockEndTrial, true);
      expect(service.isEndTrialSelected(mockEndTrial.id)).toBeTrue();
    });

    it('should clear end trial selections', () => {
      service.addEndTrialSelection(mockEndTrial);
      service.clearEndTrialSelections();
      expect(service.getEndTrialSelections()).toHaveSize(0);
    });
  });

  // Trial Device Selection tests
  describe('Trial Device selections', () => {
    it('should add and get trial device selection', () => {
      service.addTrialDeviceSelection(mockTrialDevice);
      expect(service.getTrialDeviceSelections()).toHaveSize(1);
    });

    it('should toggle trial device selection', () => {
      service.toggleTrialDeviceSelection(mockTrialDevice, true);
      expect(service.isTrialDeviceSelected(mockTrialDevice.id)).toBeTrue();
    });

    it('should clear trial device selections', () => {
      service.addTrialDeviceSelection(mockTrialDevice);
      service.clearTrialDeviceSelections();
      expect(service.getTrialDeviceSelections()).toHaveSize(0);
    });
  });
});
