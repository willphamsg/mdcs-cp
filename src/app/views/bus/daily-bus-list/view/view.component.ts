import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import DayType from '@data/day-type.json';
import { IBustList } from '@models/bus-list';
import { IDepoList } from '@models/depo';
import { DepoRequest, DropdownList, PayloadResponse } from '@models/common';
import { DepoService } from '@services/depo.service';
import { ManageDailyBusListService } from '@services/manage-daily-bus-list.service';
import { MessageService } from '@services/message.service';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonService } from '@app/services/common.service';
import { AuthService } from '@app/services/auth.service';
import { TimeInput24hDirective } from '@app/shared/directives/time-input-24h.directive';

@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
  providers: [provideNativeDateAdapter()],
  imports: [
    MatCardModule,
    MatButtonModule,
    MatToolbarModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatIcon,
    MatDividerModule,
    MatDialogActions,
    MatDialogContent,
    MatDialogClose,
    MatTableModule,
    MatIconModule,
    MatDatepickerModule,
    MatTooltipModule,
    TimeInput24hDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewComponent implements OnInit {
  @ViewChild(MatTable) _matTable: MatTable<any>;
  myForm: FormGroup;
  isUpdate: boolean = false;
  isDelete: boolean = false;
  rowCount: number = 1;
  depotId: string;
  errMsg: string;
  depots: IDepoList[] = [];
  params: DepoRequest = {
    patternSearch: false,
    search_text: '',
    is_pattern_search: false,
    page_size: 100,
    page_index: 0,
    sort_order: [],
  };
  serviceNumOptions: string[] = ['25', '30', '40'];
  options: DropdownList[] = [];
  arrivalCountOptions: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  displayedColumns = [
    'depot_id',
    'bus_num',
    'day_type',
    'est_arrival_time',
    'est_arrival_count',
    'action',
  ];
  isDisabled: boolean = false;
  svcProviderID = this.authService.getSVCProvider();
  submitAttempted: boolean = false;

  constructor(
    private readonly fb: FormBuilder,
    public readonly dialog: MatDialog,
    private readonly manageDailyBusListService: ManageDailyBusListService,
    private readonly depoService: DepoService,
    private readonly commonService: CommonService,
    private readonly message: MessageService,
    @Inject(MAT_DIALOG_DATA) public readonly data: any,
    public readonly dialogRef: MatDialogRef<ViewComponent>,
    private readonly authService: AuthService
  ) {
    // this.depoService.depo$.subscribe((value: string) => {
    //   this.depotId = value;
    // });
    this.depoService.depoList$.subscribe((value: IDepoList[]) => {
      this.depots = value;
    });
  }

  title: string;

  ngOnInit(): void {
    this.submitAttempted = false;
    this.title = this.data.title;

    this.myForm = this.fb.group({
      items: this.fb.array([]),
    });

    this.options = DayType.map((item: any) => {
      return <DropdownList>{
        id: item.id,
        value: item.value,
      };
    });

    if (this.data != null && this.data.selection?.length > 0) {
      if (this.data.action === 'delete') {
        this.isDelete = true;
        this.displayedColumns.pop();
      } else {
        this.isUpdate = true;
        // Remove action column for edit mode
        const actionIndex = this.displayedColumns.indexOf('action');
        if (actionIndex > -1) {
          this.displayedColumns.splice(actionIndex, 1);
        }
      }

      this.data.selection.forEach((element: any) => {
        const formGroup = this.existingItems(element);
        this.items.push(formGroup);
      });
      this.rowCount = this.items.length;
    } else {
      this.addItem();
    }
  }

  OnDestroy(): void {
    this.dialog.closeAll();
  }

  get items(): FormArray {
    return this.myForm.get('items') as FormArray;
  }

  getDepotName(id: string): string {
    const depotName = this.depots?.filter(item => item?.depot_id === id);
    return depotName[0]?.depot_name;
  }

  isArray(value: any): boolean {
    return Array.isArray(value);
  }

  getDayTypeDisplay(dayTypeIds: string[] | number[]): string {
    if (!Array.isArray(dayTypeIds) || dayTypeIds.length === 0) {
      return '';
    }
    return dayTypeIds
      .map(id => this.options.find(opt => opt.id === id)?.value)
      .filter(Boolean)
      .join(', ');
  }

  existingItems(element: IBustList): FormGroup {
    return this.fb.group({
      id: element.id,
      version: element.version,
      depot_id: [{ value: element.depot_id, disabled: true }],
      depot_name: element.depot_name,
      bus_num: [
        { value: element.bus_num, disabled: true },
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(8),
          this.busNumFormatValidator.bind(this),
          this.duplicateBusIdValidator.bind(this),
        ],
      ],
      // bus_num: element.bus_num,
      service_num: [
        { value: element.service_num, disabled: this.isDelete },
        // Validators.required,
      ],
      svc_prov_id: element.svc_prov_id,
      day_type: [
        {
          value: (() => {
            if (Array.isArray(element.day_type)) {
              return element.day_type;
            }
            return element.day_type ? [element.day_type] : [];
          })(),
          disabled: true,
        },
        [Validators.required, this.arrayNotEmptyValidator.bind(this)],
      ],
      day: element.day,
      est_arrival_time: [element.est_arrival_time, Validators.required],
      est_arrival_count: [
        { value: element.est_arrival_count, disabled: this.isDelete },
        [Validators.required, Validators.min(0), Validators.max(255)],
      ],
      updated_on: element.updated_on,
    });
  }

  // newItems(): FormGroup {
  //   return this.fb.group(new BusList());
  // }
  newItems(): FormGroup {
    return this.fb.group({
      depot_id: [null, Validators.required],
      svc_prov_id: [],
      bus_num: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(8),
          this.busNumFormatValidator.bind(this),
          this.duplicateBusIdValidator.bind(this),
        ],
      ],
      // service_num: ['', Validators.required],
      day_type: [
        null,
        [Validators.required, this.arrayNotEmptyValidator.bind(this)],
      ],
      est_arrival_time: ['', Validators.required],
      est_arrival_count: [
        '',
        [Validators.required, Validators.min(0), Validators.max(255)],
      ],
      // add any other fields you need
    });
  }

  addItem() {
    this.submitAttempted = false;
    const newItem = this.newItems();
    // newItem.controls['depot_id'].setValue(this.depotId);
    newItem.controls['svc_prov_id'].setValue(this.svcProviderID);
    this.items.push(newItem);
    this.reRenderTable();
  }

  removeItem(i: number) {
    if (this.items.length > 1) {
      this.items.removeAt(i);
      this.reRenderTable();
      // Update validators after removing an item
      this.updateBusIdValidators();
    }
  }

  reRenderTable(): void {
    if (this._matTable != undefined) {
      this._matTable.renderRows();
      this.rowCount = this.items.length;
    }
  }

  handleSvcValidate(e: any) {
    const val = String.fromCodePoint(!e.charCode ? e.which : e.charCode);
    const digits = val.match(/[0-9a-zA-Z]/g);

    if (digits == null) {
      e.preventDefault();
      return false;
    }

    if (e.target.value.length > 4) {
      e.preventDefault();
      return false;
    }

    return true;
  }

  handleBusValidate(e: any) {
    return this.commonService.validateBusNumber(e);
  }

  // Handle real-time duplicate validation on input for any of the key fields
  onFieldChange(currentIndex: number, fieldName: string): void {
    // Mark the current field as touched to show errors immediately
    const currentFormGroup = this.items.at(currentIndex);
    const currentControl = currentFormGroup.get(fieldName);
    if (currentControl) {
      currentControl.markAsTouched();
    }

    // Always validate the bus_num field since it contains our validator
    const busNumControl = currentFormGroup.get('bus_num');
    if (busNumControl) {
      busNumControl.markAsTouched();
      busNumControl.updateValueAndValidity({ emitEvent: false });
    }

    // Update all validators
    this.updateBusIdValidators();
  }

  // Alias for bus ID changes to maintain backward compatibility
  onBusIdInput(currentIndex: number): void {
    // Mark field as touched to show validation errors immediately while typing
    const currentFormGroup = this.items.at(currentIndex);
    const busNumControl = currentFormGroup.get('bus_num');
    if (busNumControl && !busNumControl.touched) {
      busNumControl.markAsTouched();
    }
    this.onFieldChange(currentIndex, 'bus_num');
  }

  // Custom validator for bus number format that allows partial input during editing
  private busNumFormatValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    if (!control.value) {
      return null;
    }

    const value = control.value.toString();

    // Check if it matches the basic character sequence pattern
    const partialPattern = /^[a-zA-Z]{0,3}\d{0,4}[a-zA-Z]?$/;
    if (!partialPattern.test(value)) {
      return { pattern: true };
    }

    // For input length >= 6, apply full validation
    if (value.length >= 6) {
      const fullPattern = /^[a-zA-Z]{2,3}\d{4}[a-zA-Z]?$/;
      return fullPattern.test(value) ? null : { pattern: true };
    }

    // For incomplete input (< 6 chars), show error if field is touched/blurred
    // This allows typing but shows validation feedback
    if (control.touched) {
      const fullPattern = /^[a-zA-Z]{2,3}\d{4}[a-zA-Z]?$/;
      return fullPattern.test(value) ? null : { pattern: true };
    }

    // During active typing (not touched), allow partial input
    return null;
  }

  // Custom validator to check if array is not empty
  private arrayNotEmptyValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    const value = control.value;
    // Handle both null/undefined and empty array cases
    if (!value || (Array.isArray(value) && value.length === 0)) {
      return { arrayEmpty: true };
    }
    // If value is not an array yet (might be null initially), it's invalid
    if (!Array.isArray(value)) {
      return { arrayEmpty: true };
    }
    return null;
  }

  // Custom validator to check for duplicate combinations of Depot + Bus ID + Day Type
  private duplicateBusIdValidator(
    control: AbstractControl
  ): ValidationErrors | null {
    if (!control.value || !control.parent?.parent) {
      return null;
    }

    const formArray = control.parent.parent as FormArray;
    const currentFormGroup = control.parent as FormGroup;
    const currentIndex = formArray.controls.indexOf(currentFormGroup);

    // Get current values
    const currentBusId = control.value.toUpperCase();
    const currentDepot = currentFormGroup.get('depot_id')?.value;
    const currentDayType = currentFormGroup.get('day_type')?.value;

    // If any required field is missing, skip validation
    if (
      !currentBusId ||
      !currentDepot ||
      !currentDayType ||
      !Array.isArray(currentDayType) ||
      currentDayType.length === 0
    ) {
      return null;
    }

    // Check for duplicates - compare if any day_type overlaps
    const hasDuplicate = formArray.controls.some((formGroup, index) => {
      if (index === currentIndex) return false;

      const otherBusId = formGroup.get('bus_num')?.value?.toUpperCase();
      const otherDepot = formGroup.get('depot_id')?.value;
      const otherDayType = formGroup.get('day_type')?.value;

      // Check if bus and depot match, and if any day_type overlaps
      if (currentBusId === otherBusId && currentDepot === otherDepot) {
        if (Array.isArray(otherDayType) && otherDayType.length > 0) {
          // Check if there's any overlap between the two arrays
          return currentDayType.some(day => otherDayType.includes(day));
        }
      }

      return false;
    });

    return hasDuplicate ? { duplicateCombination: true } : null;
  }

  // Update all bus_num validators when any bus_num changes
  private updateBusIdValidators(): void {
    // Get all unique bus IDs that appear more than once
    const busIdCounts = new Map<string, number>();

    this.items.controls.forEach(control => {
      const busNumControl = control.get('bus_num');
      if (busNumControl?.value) {
        const upperValue = busNumControl.value.toUpperCase();
        busIdCounts.set(upperValue, (busIdCounts.get(upperValue) || 0) + 1);
      }
    });

    // Update validation for all controls
    this.items.controls.forEach(control => {
      const busNumControl = control.get('bus_num');
      if (busNumControl && !busNumControl.disabled) {
        busNumControl.updateValueAndValidity({ emitEvent: false });
      }
    });
  }

  checkDuplicate(): {
    isDuplicate: boolean;
    duplicates: {
      bus_num: string;
      depot_id: string;
      indices: number[];
    }[];
  } {
    const items = this.myForm.get('items') as FormArray;
    // console.log('Checking duplicates for items:', items.value);

    // Create a map to track unique combinations of bus_num and depot_id
    const seenCombinations = new Map<
      string,
      {
        bus_num: string;
        depot_id: string;
        indices: number[];
        day?: string;
      }
    >();
    const duplicates: {
      bus_num: string;
      depot_id: string;
      indices: number[];
      day?: string;
    }[] = [];

    items.controls.forEach((control, index) => {
      let busNum = control
        .get('bus_num')
        ?.value?.toString()
        .trim()
        .toUpperCase();
      const depotId = control.get('depot_id')?.value?.toString().trim();

      // Skip validation for empty or invalid entries
      if (!busNum || !depotId || busNum.length < 5) {
        return;
      }

      //edit or delete
      let day: string =
        //create
        control.get('day_type')?.value?.toString().trim() ||
        //edit or delete
        control.get('day')?.value?.toString().trim();

      // Remove last character if it's an alphabet
      const originalBusNum = busNum; // Keep original for storage
      if (/[A-Z]$/.test(busNum)) {
        busNum = busNum.slice(0, -1);
      }

      const key = `${busNum}-${depotId}-${day || ''}`; // Unique key for combination

      if (seenCombinations.has(key)) {
        const existing = seenCombinations.get(key)!;
        existing.indices.push(index);

        // Update existing duplicate entry in duplicates array
        const existingDuplicate = duplicates.find(d => {
          // Compare bus numbers without last alphabet if they end with one
          let existingBusNum = d.bus_num;
          if (/[A-Z]$/.test(existingBusNum)) {
            existingBusNum = existingBusNum.slice(0, -1);
          }

          if (existingBusNum) {
            return existingBusNum === busNum && d.depot_id === depotId;
          } else {
            return d.bus_num === busNum && d.depot_id === depotId;
          }
        });
        if (existingDuplicate) {
          existingDuplicate.indices = [...existing.indices];
        } else {
          // Add to duplicates array if not already added
          duplicates.push({
            bus_num: originalBusNum,
            depot_id: depotId,
            indices: [...existing.indices],
            day,
          });
        }
      } else {
        seenCombinations.set(key, {
          bus_num: originalBusNum,
          depot_id: depotId,
          indices: [index],
          day,
        });
      }
    });

    return {
      isDuplicate: duplicates.length > 0,
      duplicates: duplicates,
    };
  }

  isNotAllowedSubmit(): boolean {
    let isNotAllowed: boolean = false;
    const items = this.myForm.get('items') as FormArray;

    // Check for business rule violations (always block these)
    const hasTransferNeeded = items.controls.some(
      control => control.get('status')?.value === 'INFO 3080'
    );
    // console.log('hasTransferNeeded:', hasTransferNeeded);

    const hasDuplicates = this.checkDuplicate().isDuplicate;
    // console.log('hasDuplicates:', hasDuplicates);

    // Always check form validity - button should be disabled if form is invalid
    // This ensures button is greyed out by default when dialog opens
    const hasValidationErrors = !this.myForm.valid;
    // console.log('hasValidationErrors:', hasValidationErrors);

    // Also check if there are no items
    const hasNoItems = items.length === 0;
    // console.log('hasNoItems:', hasNoItems);

    isNotAllowed =
      hasTransferNeeded || hasDuplicates || hasValidationErrors || hasNoItems;

    return isNotAllowed;
  }

  onSubmit() {
    this.submitAttempted = true;
    this.myForm.markAllAsTouched();
    if (this.myForm.valid && this.items.length > 0) {
      if (this.myForm.value.items.length <= 0) {
        this.message.confirmation('Warning', 'No Record To Save');
        return;
      }

      const rawItems = this.myForm.getRawValue().items;

      if (this.data.action === 'add') {
        // For add: expand each item's day_type array into individual entries
        // and send all entries in a single API call
        const expandedItems = rawItems.flatMap((item: any) => {
          let dayTypes: string[];
          if (Array.isArray(item.day_type)) {
            dayTypes = item.day_type;
          } else {
            dayTypes = item.day_type ? [item.day_type] : [];
          }

          return dayTypes.map((dayType: string) => ({
            ...item,
            day_type: dayType,
          }));
        });

        if (expandedItems.length === 0) {
          this.message.confirmation('Warning', 'No Record To Save');
          return;
        }

        this.manageDailyBusListService.add(expandedItems).subscribe({
          next: (response: PayloadResponse) => {
            const resp = this.message.MessageResponse(response, false);
            if (resp) {
              this.dialog.closeAll();
            }
          },
          error: (err: HttpErrorResponse) => {
            this.message.multiError(err);
          },
        });
      } else {
        const mappingItems = rawItems.map((item: any) => ({
          ...item,
          day_type: item.day_type.join(),
        }));
        // For update/delete: keep original structure (day_type need to flattened to string)
        this.manageDailyBusListService
          .manage(mappingItems, this.data.action)
          .subscribe({
            next: (value: PayloadResponse) => {
              const resp = this.message.MessageResponse(value, false);
              if (resp) {
                this.dialog.closeAll();
              }
            },
            error: (err: HttpErrorResponse) => {
              this.message.multiError(err);
            },
          });
      }
    }
  }
}
