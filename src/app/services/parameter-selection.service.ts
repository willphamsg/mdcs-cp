import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  INewParameterApproval,
  IParameterMode,
  IEndTrial,
  ITrialDeviceSelection,
} from '@models/parameter-trial';

// Generic interface for selectable items
interface ISelectable {
  chk: boolean;
  id: string | number;
}

// Generic selection manager class
class SelectionManager<T extends ISelectable> {
  private readonly selectedItemsMap = new Map<string, T>();
  private readonly selectionSubject = new BehaviorSubject<T[]>([]);

  public selection$: Observable<T[]> = this.selectionSubject.asObservable();

  addSelection(item: T): void {
    this.selectedItemsMap.set(String(item.id), item);
    this.updateSelectionSubject();
  }

  removeSelection(itemId: string | number): void {
    this.selectedItemsMap.delete(String(itemId));
    this.updateSelectionSubject();
  }

  toggleSelection(item: T, isSelected: boolean): void {
    if (isSelected) {
      this.addSelection(item);
    } else {
      this.removeSelection(item.id);
    }
  }

  addMultipleSelections(items: T[]): void {
    items.forEach(item => {
      this.selectedItemsMap.set(String(item.id), item);
    });
    this.updateSelectionSubject();
  }

  removeMultipleSelections(itemIds: string[]): void {
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
export class ParameterSelectionService {
  // Separate selection managers for each component type
  private readonly newParameterApprovalManager =
    new SelectionManager<INewParameterApproval>();
  private readonly parameterModeManager = new SelectionManager<IParameterMode>();
  private readonly endTrialManager = new SelectionManager<IEndTrial>();
  private readonly trialDeviceSelectionManager =
    new SelectionManager<ITrialDeviceSelection>();

  // Expose observables for each type
  public selection$ = this.newParameterApprovalManager.selection$;
  public parameterModeSelection$ = this.parameterModeManager.selection$;
  public endTrialSelection$ = this.endTrialManager.selection$;
  public trialDeviceSelection$ = this.trialDeviceSelectionManager.selection$;

  constructor() {}

  // Methods for New Parameter Approval (backward compatibility)
  addSelection(item: INewParameterApproval): void {
    this.newParameterApprovalManager.addSelection(item);
  }

  removeSelection(itemId: string | number): void {
    this.newParameterApprovalManager.removeSelection(itemId);
  }

  toggleSelection(item: INewParameterApproval, isSelected: boolean): void {
    this.newParameterApprovalManager.toggleSelection(item, isSelected);
  }

  addMultipleSelections(items: INewParameterApproval[]): void {
    this.newParameterApprovalManager.addMultipleSelections(items);
  }

  removeMultipleSelections(itemIds: string[]): void {
    this.newParameterApprovalManager.removeMultipleSelections(itemIds);
  }

  isSelected(itemId: string | number): boolean {
    return this.newParameterApprovalManager.isSelected(itemId);
  }

  getSelections(): INewParameterApproval[] {
    return this.newParameterApprovalManager.getSelections();
  }

  getSelectionCount(): number {
    return this.newParameterApprovalManager.getSelectionCount();
  }

  clearSelections(): void {
    this.newParameterApprovalManager.clearSelections();
  }

  // Methods for Parameter Mode
  addParameterModeSelection(item: IParameterMode): void {
    this.parameterModeManager.addSelection(item);
  }

  removeParameterModeSelection(itemId: string | number): void {
    this.parameterModeManager.removeSelection(itemId);
  }

  toggleParameterModeSelection(
    item: IParameterMode,
    isSelected: boolean
  ): void {
    this.parameterModeManager.toggleSelection(item, isSelected);
  }

  addMultipleParameterModeSelections(items: IParameterMode[]): void {
    this.parameterModeManager.addMultipleSelections(items);
  }

  removeMultipleParameterModeSelections(itemIds: string[]): void {
    this.parameterModeManager.removeMultipleSelections(itemIds);
  }

  isParameterModeSelected(itemId: string | number): boolean {
    return this.parameterModeManager.isSelected(itemId);
  }

  getParameterModeSelections(): IParameterMode[] {
    return this.parameterModeManager.getSelections();
  }

  clearParameterModeSelections(): void {
    this.parameterModeManager.clearSelections();
  }

  // Methods for End Trial
  addEndTrialSelection(item: IEndTrial): void {
    this.endTrialManager.addSelection(item);
  }

  removeEndTrialSelection(itemId: string | number): void {
    this.endTrialManager.removeSelection(itemId);
  }

  toggleEndTrialSelection(item: IEndTrial, isSelected: boolean): void {
    this.endTrialManager.toggleSelection(item, isSelected);
  }

  addMultipleEndTrialSelections(items: IEndTrial[]): void {
    this.endTrialManager.addMultipleSelections(items);
  }

  removeMultipleEndTrialSelections(itemIds: string[]): void {
    this.endTrialManager.removeMultipleSelections(itemIds);
  }

  isEndTrialSelected(itemId: string | number): boolean {
    return this.endTrialManager.isSelected(itemId);
  }

  getEndTrialSelections(): IEndTrial[] {
    return this.endTrialManager.getSelections();
  }

  clearEndTrialSelections(): void {
    this.endTrialManager.clearSelections();
  }

  // Methods for Trial Device Selection
  addTrialDeviceSelection(item: ITrialDeviceSelection): void {
    this.trialDeviceSelectionManager.addSelection(item);
  }

  removeTrialDeviceSelection(itemId: string | number): void {
    this.trialDeviceSelectionManager.removeSelection(itemId);
  }

  toggleTrialDeviceSelection(
    item: ITrialDeviceSelection,
    isSelected: boolean
  ): void {
    this.trialDeviceSelectionManager.toggleSelection(item, isSelected);
  }

  addMultipleTrialDeviceSelections(items: ITrialDeviceSelection[]): void {
    this.trialDeviceSelectionManager.addMultipleSelections(items);
  }

  removeMultipleTrialDeviceSelections(itemIds: string[]): void {
    this.trialDeviceSelectionManager.removeMultipleSelections(itemIds);
  }

  isTrialDeviceSelected(itemId: string | number): boolean {
    return this.trialDeviceSelectionManager.isSelected(itemId);
  }

  getTrialDeviceSelections(): ITrialDeviceSelection[] {
    return this.trialDeviceSelectionManager.getSelections();
  }

  clearTrialDeviceSelections(): void {
    this.trialDeviceSelectionManager.clearSelections();
  }
}
