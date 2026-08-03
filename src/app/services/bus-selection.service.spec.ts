import { TestBed } from '@angular/core/testing';
import { BusSelectionService } from './bus-selection.service';
import { IBusTransferList } from '@models/bus-transfer';
import { IBustList } from '@models/bus-list';
import { IVehicleList } from '@models/vehicle-list';

describe('BusSelectionService', () => {
  let service: BusSelectionService;

  const mockBusTransfer: IBusTransferList = {
    chk: false,
    id: 1,
    version: 1,
    bus_id: 'BUS001',
    bus_num: '100',
    current_depot: ['D1'],
    current_depot_name: ['Depot 1'],
    current_operator: 'OP1',
    current_operator_name: 'Operator 1',
    current_effective_date: '2024-01-01',
    future_depot: ['D2'],
    future_depot_name: ['Depot 2'],
    future_operator: 'OP2',
    future_operator_name: 'Operator 2',
    status: 'PENDING',
    future_effective_date: '2024-02-01',
    target_effective_date: '2024-02-01',
    target_effective_time: '08:00',
  };

  const mockDailyBusList: IBustList = {
    chk: false,
    id: 1,
    version: 1,
    depot_id: 'D1',
    depot_name: 'Depot 1',
    bus_num: '100',
    service_num: 'SVC1',
    svc_prov_id: 1,
    day_type: 'WD',
    est_arrival_time: '08:00',
    est_arrival_count: 5,
    updated_on: '2024-01-01',
    last_update: '2024-01-01',
  };

  const mockVehicle: IVehicleList = {
    chk: false,
    id: 1,
    master_bus_depot_id: 10,
    version: 1,
    depot_id: 'D1',
    depot_name: 'Depot 1',
    bus_num: '100',
    effective_date: '2024-01-01',
    status: 'ACTIVE',
    svc_prov_id: 1,
    updated_on: '2024-01-01',
    group_num: 1,
    effective_time: '08:00',
    hidden: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BusSelectionService],
    });
    service = TestBed.inject(BusSelectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // Bus Transfer selection tests
  describe('Bus Transfer selections', () => {
    it('should add and get bus transfer selection', () => {
      service.addBusTransferSelection(mockBusTransfer);
      expect(service.getBusTransferSelections()).toHaveSize(1);
    });

    it('should remove bus transfer selection', () => {
      service.addBusTransferSelection(mockBusTransfer);
      service.removeBusTransferSelection(mockBusTransfer.id);
      expect(service.getBusTransferSelections()).toHaveSize(0);
    });

    it('should select bus transfer via add', () => {
      service.addBusTransferSelection(mockBusTransfer);
      expect(service.isBusTransferSelected(mockBusTransfer.id)).toBeTrue();
    });

    it('should deselect bus transfer via remove', () => {
      service.addBusTransferSelection(mockBusTransfer);
      service.removeBusTransferSelection(mockBusTransfer.id);
      expect(service.isBusTransferSelected(mockBusTransfer.id)).toBeFalse();
    });

    it('should add multiple bus transfer selections', () => {
      const item2 = { ...mockBusTransfer, id: 2 };
      service.addMultipleBusTransferSelections([mockBusTransfer, item2]);
      expect(service.getBusTransferSelectionCount()).toBe(2);
    });

    it('should remove multiple bus transfer selections', () => {
      const item2 = { ...mockBusTransfer, id: 2 };
      service.addMultipleBusTransferSelections([mockBusTransfer, item2]);
      service.removeMultipleBusTransferSelections(['1', '2']);
      expect(service.getBusTransferSelectionCount()).toBe(0);
    });

    it('should clear bus transfer selections', () => {
      service.addBusTransferSelection(mockBusTransfer);
      service.clearBusTransferSelections();
      expect(service.getBusTransferSelectionCount()).toBe(0);
    });

    it('should emit bus transfer selection changes', (done) => {
      service.busTransferSelection$.subscribe(selections => {
        if (selections.length === 1) {
          expect(selections[0].id).toBe(mockBusTransfer.id);
          done();
        }
      });
      service.addBusTransferSelection(mockBusTransfer);
    });
  });

  // Daily Bus List selection tests
  describe('Daily Bus List selections', () => {
    it('should add and get daily bus list selection', () => {
      service.addDailyBusListSelection(mockDailyBusList);
      expect(service.getDailyBusListSelections()).toHaveSize(1);
    });

    it('should select daily bus list via add', () => {
      service.addDailyBusListSelection(mockDailyBusList);
      expect(service.isDailyBusListSelected(mockDailyBusList.id)).toBeTrue();
    });

    it('should clear daily bus list selections', () => {
      service.addDailyBusListSelection(mockDailyBusList);
      service.clearDailyBusListSelections();
      expect(service.getDailyBusListSelectionCount()).toBe(0);
    });
  });

  // Vehicle selection tests
  describe('Vehicle selections', () => {
    it('should add and get vehicle selection', () => {
      service.addVehicleSelection(mockVehicle);
      expect(service.getVehicleSelections()).toHaveSize(1);
    });

    it('should select vehicle via add', () => {
      service.addVehicleSelection(mockVehicle);
      expect(service.getVehicleSelectionCount()).toBeGreaterThan(0);
    });

    it('should clear vehicle selections', () => {
      service.addVehicleSelection(mockVehicle);
      service.clearVehicleSelections();
      expect(service.getVehicleSelectionCount()).toBe(0);
    });

    it('should remove a vehicle selection using its master_bus_depot_id', () => {
      service.addVehicleSelection(mockVehicle);
      service.removeVehicleSelection(mockVehicle.master_bus_depot_id as number);
      expect(service.isVehicleSelected(mockVehicle.master_bus_depot_id as number)).toBeFalse();
    });

    it('should add multiple vehicle selections keyed by master_bus_depot_id', () => {
      const item2 = { ...mockVehicle, id: 2, master_bus_depot_id: 20 };
      service.addMultipleVehicleSelections([mockVehicle, item2]);
      expect(service.getVehicleSelectionCount()).toBe(2);
    });

    it('should remove multiple vehicle selections', () => {
      const item2 = { ...mockVehicle, id: 2, master_bus_depot_id: 20 };
      service.addMultipleVehicleSelections([mockVehicle, item2]);
      service.removeMultipleVehicleSelections(['10', '20']);
      expect(service.getVehicleSelectionCount()).toBe(0);
    });

    it('should report a vehicle as not selected before it is added', () => {
      expect(service.isVehicleSelected(mockVehicle.master_bus_depot_id as number)).toBeFalse();
    });

    it('should fall back to item.id when adding a vehicle without a master_bus_depot_id', () => {
      const noDepotVehicle = { ...mockVehicle, id: 99, master_bus_depot_id: undefined };
      service.addVehicleSelection(noDepotVehicle);
      expect(service.isVehicleSelected(99)).toBeTrue();
    });
  });

  // Daily Bus List selection tests - remaining methods
  describe('Daily Bus List selections (remaining methods)', () => {
    it('should remove a daily bus list selection', () => {
      service.addDailyBusListSelection(mockDailyBusList);
      service.removeDailyBusListSelection(mockDailyBusList.id);
      expect(service.isDailyBusListSelected(mockDailyBusList.id)).toBeFalse();
    });

    it('should add multiple daily bus list selections', () => {
      const item2 = { ...mockDailyBusList, id: 2 };
      service.addMultipleDailyBusListSelections([mockDailyBusList, item2]);
      expect(service.getDailyBusListSelectionCount()).toBe(2);
    });

    it('should remove multiple daily bus list selections', () => {
      const item2 = { ...mockDailyBusList, id: 2 };
      service.addMultipleDailyBusListSelections([mockDailyBusList, item2]);
      service.removeMultipleDailyBusListSelections(['1', '2']);
      expect(service.getDailyBusListSelectionCount()).toBe(0);
    });

    it('should get all daily bus list selections', () => {
      service.addDailyBusListSelection(mockDailyBusList);
      expect(service.getDailyBusListSelections()).toEqual([mockDailyBusList]);
    });

    it('should get the daily bus list selection count', () => {
      service.addDailyBusListSelection(mockDailyBusList);
      expect(service.getDailyBusListSelectionCount()).toBe(1);
    });

    it('should emit daily bus list selection changes', (done) => {
      service.dailyBusListSelection$.subscribe(selections => {
        if (selections.length === 1) {
          expect(selections[0].id).toBe(mockDailyBusList.id);
          done();
        }
      });
      service.addDailyBusListSelection(mockDailyBusList);
    });
  });

  // Directly exercise the generic SelectionManager's selectItem/deselectItem,
  // which are not reached through BusSelectionService's public wrapper methods.
  describe('SelectionManager selectItem/deselectItem (accessed via private managers)', () => {
    it('should select an item via selectItem (useDepotId=false)', () => {
      const manager = (service as any).busTransferManager;
      manager.selectItem(mockBusTransfer);
      expect(manager.isSelected(mockBusTransfer.id)).toBeTrue();
    });

    it('should deselect an item via deselectItem (useDepotId=false)', () => {
      const manager = (service as any).busTransferManager;
      manager.selectItem(mockBusTransfer);
      manager.deselectItem(mockBusTransfer);
      expect(manager.isSelected(mockBusTransfer.id)).toBeFalse();
    });

    it('should select an item via selectItem (useDepotId=true, master_bus_depot_id present)', () => {
      const manager = (service as any).vehicleManager;
      manager.selectItem(mockVehicle, true);
      expect(manager.isSelected(mockVehicle.master_bus_depot_id)).toBeTrue();
    });

    it('should deselect an item via deselectItem (useDepotId=true, master_bus_depot_id present)', () => {
      const manager = (service as any).vehicleManager;
      manager.selectItem(mockVehicle, true);
      manager.deselectItem(mockVehicle, true);
      expect(manager.isSelected(mockVehicle.master_bus_depot_id)).toBeFalse();
    });

    it('should deselect an item via deselectItem (useDepotId=true, master_bus_depot_id undefined falls back to id)', () => {
      const manager = (service as any).vehicleManager;
      const noDepotVehicle = { ...mockVehicle, id: 55, master_bus_depot_id: undefined };
      manager.selectItem(noDepotVehicle, true);
      expect(manager.isSelected(55)).toBeTrue();
      manager.deselectItem(noDepotVehicle, true);
      expect(manager.isSelected(55)).toBeFalse();
    });
  });
});
