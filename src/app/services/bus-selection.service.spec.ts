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
  });
});
