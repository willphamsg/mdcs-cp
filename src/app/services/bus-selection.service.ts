import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IBusTransferList } from '@models/bus-transfer';
import { IBustList } from '@models/bus-list';
import { IVehicleList } from '@models/vehicle-list';

// Generic interface for selectable items
interface ISelectable {
  chk: boolean;
  id: string | number;
  master_bus_depot_id?: string | number;
}

// Generic selection manager class
class SelectionManager<T extends ISelectable> {
  private readonly selectedItemsMap = new Map<string, T>();
  private readonly selectionSubject = new BehaviorSubject<T[]>([]);

  public selection$: Observable<T[]> = this.selectionSubject.asObservable();

  addSelection(item: T, useDepotId: boolean = false): void {
    const key = useDepotId && item.master_bus_depot_id !== undefined
      ? String(item.master_bus_depot_id)
      : String(item.id);
    this.selectedItemsMap.set(key, item);
    this.updateSelectionSubject();
  }

  removeSelection(itemId: string | number): void {
    this.selectedItemsMap.delete(String(itemId));
    this.updateSelectionSubject();
  }

  selectItem(item: T, useDepotId: boolean = false): void {
    this.addSelection(item, useDepotId);
  }

  deselectItem(item: T, useDepotId: boolean = false): void {
    const key =
      useDepotId && item.master_bus_depot_id !== undefined
        ? item.master_bus_depot_id
        : item.id;
    this.removeSelection(key);
  }

  addMultipleSelections(items: T[], useDepotId: boolean = false): void {
    items.forEach(item => {
      const key = useDepotId && item.master_bus_depot_id !== undefined
        ? String(item.master_bus_depot_id)
        : String(item.id);
      this.selectedItemsMap.set(key, item);
    });
    this.updateSelectionSubject();
  }

  removeMultipleSelections(
    itemIds: string[]
  ): void {
    itemIds.forEach(id => {
      this.selectedItemsMap.delete(String(id));
    });
    this.updateSelectionSubject();
  }

  isSelected(itemId: string | number): boolean {
    return this.selectedItemsMap.has(String(itemId));
  }

  getSelections(): T[] {
    return Array.from(this.selectedItemsMap.values());
  }

  getSelectionCount(): number {
    return this.selectedItemsMap.size;
  }

  clearSelections(): void {
    this.selectedItemsMap.clear();
    this.updateSelectionSubject();
  }

  private updateSelectionSubject(): void {
    this.selectionSubject.next(this.getSelections());
  }
}

@Injectable({
  providedIn: 'root',
})
export class BusSelectionService {
  // Separate selection managers for each bus component type
  private readonly busTransferManager = new SelectionManager<IBusTransferList>();
  private readonly dailyBusListManager = new SelectionManager<IBustList>();
  private readonly vehicleManager = new SelectionManager<IVehicleList>();

  // Expose observables for each type
  public readonly busTransferSelection$ = this.busTransferManager.selection$;
  public readonly dailyBusListSelection$ = this.dailyBusListManager.selection$;
  public readonly vehicleSelection$ = this.vehicleManager.selection$;

  constructor() {}

  // Methods for Bus Transfer
  addBusTransferSelection(item: IBusTransferList): void {
    this.busTransferManager.addSelection(item);
  }

  removeBusTransferSelection(itemId: string | number): void {
    this.busTransferManager.removeSelection(itemId);
  }

  addMultipleBusTransferSelections(items: IBusTransferList[]): void {
    this.busTransferManager.addMultipleSelections(items);
  }

  removeMultipleBusTransferSelections(itemIds: string[]): void {
    this.busTransferManager.removeMultipleSelections(itemIds);
  }

  isBusTransferSelected(itemId: string | number): boolean {
    return this.busTransferManager.isSelected(itemId);
  }

  getBusTransferSelections(): IBusTransferList[] {
    return this.busTransferManager.getSelections();
  }

  getBusTransferSelectionCount(): number {
    return this.busTransferManager.getSelectionCount();
  }

  clearBusTransferSelections(): void {
    this.busTransferManager.clearSelections();
  }

  // Methods for Daily Bus List
  addDailyBusListSelection(item: IBustList): void {
    this.dailyBusListManager.addSelection(item);
  }

  removeDailyBusListSelection(itemId: string | number): void {
    this.dailyBusListManager.removeSelection(itemId);
  }

  addMultipleDailyBusListSelections(items: IBustList[]): void {
    this.dailyBusListManager.addMultipleSelections(items);
  }

  removeMultipleDailyBusListSelections(itemIds: string[]): void {
    this.dailyBusListManager.removeMultipleSelections(itemIds);
  }

  isDailyBusListSelected(itemId: string | number): boolean {
    return this.dailyBusListManager.isSelected(itemId);
  }

  getDailyBusListSelections(): IBustList[] {
    return this.dailyBusListManager.getSelections();
  }

  getDailyBusListSelectionCount(): number {
    return this.dailyBusListManager.getSelectionCount();
  }

  clearDailyBusListSelections(): void {
    this.dailyBusListManager.clearSelections();
  }

  // Methods for Vehicle
  addVehicleSelection(item: IVehicleList): void {
    this.vehicleManager.addSelection(item, true);
  }

  removeVehicleSelection(itemId: string | number): void {
    this.vehicleManager.removeSelection(itemId);
  }

  addMultipleVehicleSelections(items: IVehicleList[]): void {
    this.vehicleManager.addMultipleSelections(items, true);
  }

  removeMultipleVehicleSelections(itemIds: string[]): void {
    this.vehicleManager.removeMultipleSelections(itemIds);
  }

  isVehicleSelected(itemId: string | number): boolean {
    return this.vehicleManager.isSelected(itemId);
  }

  getVehicleSelections(): IVehicleList[] {
    return this.vehicleManager.getSelections();
  }

  getVehicleSelectionCount(): number {
    return this.vehicleManager.getSelectionCount();
  }

  clearVehicleSelections(): void {
    this.vehicleManager.clearSelections();
  }
}
