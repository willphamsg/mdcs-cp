import { CommonModule, DatePipe } from '@angular/common';
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
import {
  MatNativeDateModule,
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTable, MatTableModule } from '@angular/material/table';
import { DropdownList, PayloadResponse } from '@models/common';
import {
  IVehicleDelete,
  IVehicleList,
  VehicleInfo,
  VehicleStatusEnum,
  VehicleStatusLabelMapping,
} from '@models/vehicle-list';
import { IDepoList } from '@models/depo';
import { DepoService } from '@services/depo.service';
import { MasterService } from '@services/master.service';
import { MessageService } from '@services/message.service';
import { AppStore } from '@store/app.state';
import { Store } from '@ngrx/store';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonService } from '@app/services/common.service';
import { DD_MM_YYYY_FORMAT } from '@app/shared/utils/date-time';
import { TimeInput24hDirective } from '@app/shared/directives/time-input-24h.directive';
@Component({
  selector: 'app-view',
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
  ],
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatTableModule,
    MatDialogActions,
    MatDialogContent,
    MatDialogClose,
    MatButtonModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    TimeInput24hDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
})
export class ViewComponent implements OnInit {
  myForm: FormGroup;
  @ViewChild(MatTable) _matTable: MatTable<any>;
  rowCount: number = 1;
  displayedColumns = [
    'depot_id',
    'bus_num',
    'effective_date',
    // 'effective_time',
    // 'status',
    // 'action',
  ];
  depotId: string;
  depots: IDepoList[] = [];
  statusOptions: DropdownList[] = Object.values(VehicleStatusEnum).map(_s => ({
    id: _s,
    value: VehicleStatusLabelMapping[_s],
  }));
  isDisabled: boolean = false;
  isDelete: boolean = false;
  isEdit: boolean = false;
  isAdd: boolean = false;
  submitAttempted: boolean = false;

  minDate = new Date();

  constructor(
    private readonly fb: FormBuilder,
    public readonly dialog: MatDialog,
    private readonly masterService: MasterService,
    private readonly depoService: DepoService,
    private readonly commonService: CommonService,
    private readonly message: MessageService,
    private readonly store: Store<AppStore>,
    @Inject(MAT_DIALOG_DATA) public readonly data: any
  ) {
    this.depoService.depo$.subscribe((value: string) => {
      this.depotId = value;
    });

    this.depoService.depoList$.subscribe((value: IDepoList[]) => {
      this.depots = value;
    });
  }

  ngOnInit() {
    this.myForm = this.fb.group({
      items: this.fb.array([]),
    });
    this.isDelete = this?.data?.action === 'delete';
    this.isEdit = this?.data?.action === 'update';
    this.isAdd = this?.data?.action === 'add';
    this.submitAttempted = false;

    if (this.data != null && this.data.selection?.length > 0) {
      this.data.selection.forEach((element: any) => {
        this.items.push(this.existingItems(element));
      });
      this.rowCount = this.items.length;
      this.isDisabled = true;
    } else {
      this.addItem();
    }

    if (this.isDelete) {
      this.displayedColumns.push('status');
    } else {
      this.displayedColumns.push('effective_time');
    }

    if (!this.isDelete && !this.isEdit) {
      this.displayedColumns.push('action');
    }
  }

  busHandler(index: number) {
    const items = this.myForm.get('items') as FormArray;

    // Mark field as touched to show validation errors immediately while typing
    const busNumControl = items.controls[index].get('bus_num');
    if (busNumControl && !busNumControl.touched) {
      busNumControl.markAsTouched();
    }
    busNumControl?.updateValueAndValidity();

    // Always check for duplicates on input change
    this.updateDuplicateStatuses();

    if (items.controls[index].get('bus_num')?.value.length < 5) {
      return;
    }

    this.masterService
      .find({
        bus_num: items.controls[index].get('bus_num')?.value,
        depot_id: items.controls[index].get('depot_id')?.value,
        svc_prov_id: sessionStorage.getItem('svdProvId'),
      })
      .subscribe({
        next: (value: PayloadResponse) => {
          if (value.status === 200) {
            const status = value.status_code;
            items.controls[index].get('status')?.patchValue(status);
            // Handle statuses that require read-only fields
            if (status === 'INFO 3076' || status === 'INFO 3079') {
              items.controls[index].get('hidden')?.patchValue(true);
              const source = value.payload['master_bus_entry'];
              items.controls[index]
                .get('effective_date')
                ?.patchValue(
                  new DatePipe('en-US').transform(
                    source.effective_date,
                    'yyyy-MM-dd'
                  )
                );
              items.controls[index]
                .get('effective_time')
                ?.patchValue(
                  // new DatePipe('en-US').transform(source.effective_date, 'H:mm')
                  new DatePipe('en-US').transform(source.effective_date, 'HH:mm')
                );

              // Keep fields editable if status is not read-only
              items.controls[index].get('effective_date')?.markAsUntouched();
              items.controls[index].get('effective_time')?.markAsUntouched();
            } else {
              items.controls[index].get('hidden')?.patchValue(false);
              items.controls[index]
                .get('effective_date')
                ?.patchValue(undefined);
              items.controls[index]
                .get('effective_time')
                ?.patchValue(undefined);
            }

            // Disable fields for "Bus Transfer Needed"
            if (status === 'INFO 3080') {
              items.controls[index].get('depot_id')?.disable();
              items.controls[index].get('effective_date')?.disable();
              items.controls[index].get('effective_time')?.disable();
            } else {
              items.controls[index].get('depot_id')?.enable();
              items.controls[index].get('effective_date')?.enable();
              items.controls[index].get('effective_time')?.enable();
            }
          } else {
            items.controls[index].get('status')?.patchValue('Error!');
          }
          // Check duplicates again after server response
          this.updateDuplicateStatuses();
        },
      });
  }

  updateDuplicateStatuses() {
    const items = this.myForm.get('items') as FormArray;
    const duplicates = this.checkDuplicate();

    // First, clear all duplicate statuses
    items.controls.forEach(control => {
      const currentStatus = control.get('status')?.value;
      if (currentStatus === 'DUPLICATE') {
        control.get('status')?.patchValue('');
      }
    });

    // Then set duplicate status for actual duplicates
    if (duplicates.isDuplicate) {
      duplicates.duplicates.forEach(duplicate => {
        duplicate.indices.forEach(duplicateIndex => {
          items.controls[duplicateIndex].get('status')?.patchValue('DUPLICATE');
        });
      });
    }
  }

  removeItem(i: number) {
    this.items.removeAt(i);
    this.reRenderTable();
    this.updateDuplicateStatuses();
  }

  addItem() {
    const newItem = this.newItems();
    // Don't set default depot_id to show "Select" placeholder
    // newItem.controls['depot_id'].setValue(this.depotId);
    this.items.push(newItem);
    this.reRenderTable();
    // Reset submit attempted flag when adding new items
    this.submitAttempted = false;
  }

  reRenderTable(): void {
    if (this._matTable != undefined) {
      this._matTable.renderRows();
      this.rowCount = this.items.length;
    }
  }

  newItems(): FormGroup {
    // Create form group with custom validation for new items
    return this.fb.group({
      id: [0],
      version: [0],
      bus_num: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(8),
          this.busNumFormatValidator.bind(this),
        ],
      ],
      depot_id: [null, Validators.required],
      group_num: [1],
      svc_prov_id: [sessionStorage.getItem('svdProvId')],
      effective_date: [null, Validators.required],
      effective_time: [null, Validators.required],
      updated_on: [''],
      status: [''], // Not required initially - gets set by server response
      hidden: [false],
    });
  }

  existingItems(element: IVehicleList): FormGroup {
    const d = new DatePipe('en-US').transform(
      element.effective_date,
      'yyyy-MM-dd'
    );
    const t = new DatePipe('en-US').transform(element.effective_date, 'HH:mm');
    return this.fb.group({
      id: element.id,
      version: element.version,
      bus_num: [
        { value: element.bus_num, disabled: true },
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(8),
          this.busNumFormatValidator.bind(this),
        ],
      ],
      depot_id: element.depot_id,
      group_num: element.group_num,
      svc_prov_id: element.svc_prov_id,
      effective_date: d,
      effective_time: t,
      updated_on: element.updated_on,
      status: element.status,
      hidden: false,
    });
  }

  get items(): FormArray {
    return this.myForm.get('items') as FormArray;
  }

  getStatusValue(index: number) {
    const items = this.myForm.get('items') as FormArray;
    const value = items.controls[index].get('status')?.value;
    if (items.controls[index].get('bus_num')?.value.length < 5) {
      return '';
    }
    switch (value) {
      // case 'INFO 3076': // allowed to add depot but no change effective date time
      //   return 'Bus found in the system';
      // case 'WARN 3077': // do nothing
      //   return 'Missing parameter when request';
      // case 'INFO 3078': // allowed to add
      //   return 'New record';
      // case 'INFO 3079': // allowed to add depot but no change effective date time
      //   return 'Bus found at different depot';
      case 'INFO 3080': // not allowed
        return 'Bus transfer needed';
      case 'DUPLICATE': // not allowed
        return 'Bus No is duplicate';
    }
    return '';
  }

  getHiddenValue(index: number) {
    const items = this.myForm.get('items') as FormArray;
    return items.controls[index].get('hidden')?.value;
  }

  getDateValue(index: number) {
    const items = this.myForm.get('items') as FormArray;
    const d = items.controls[index].get('effective_date')?.value;
    if (d !== null && d != undefined) {
      return d;
    }
    return '';
  }

  getTimeValue(index: number) {
    const items = this.myForm.get('items') as FormArray;
    const t = items.controls[index].get('effective_time')?.value;
    if (t !== null && t != undefined) {
      return t;
    }
    return '';
  }

  getDepotName(id: string): string {
    const depotName = this.depots?.filter(item => item?.depot_id === id);
    return depotName[0]?.depot_name;
  }

  isReadOnlyForEffectiveFields(index: number): boolean {
    const items = this.myForm.get('items') as FormArray;
    const status = items.controls[index].get('status')?.value;

    // Read-only for these statuses
    return status === 'INFO 3076' || status === 'INFO 3079';
  }

  isBusTransferNeeded(index: number): boolean {
    const items = this.myForm.get('items') as FormArray;
    const status = items.controls[index].get('status_value')?.value;

    // Return true if status indicates "Bus Transfer Needed"
    return status === 'INFO 3080';
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

    // Create a map to track unique combinations of bus_num and depot_id
    const seenCombinations = new Map<
      string,
      {
        bus_num: string;
        depot_id: string;
        indices: number[];
      }
    >();
    const duplicates: {
      bus_num: string;
      depot_id: string;
      indices: number[];
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

      // Remove last character if it's an alphabet
      const originalBusNum = busNum; // Keep original for storage
      if (/[A-Z]$/.test(busNum)) {
        busNum = busNum.slice(0, -1);
      }

      const key = `${busNum}-${depotId}`; // Unique key for combination

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
          });
        }
      } else {
        seenCombinations.set(key, {
          bus_num: originalBusNum,
          depot_id: depotId,
          indices: [index],
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
    const hasDuplicates = this.checkDuplicate().isDuplicate;

    // Always check form validity - button should be disabled if form is invalid
    // This ensures button is greyed out by default when dialog opens
    const hasValidationErrors = !this.myForm.valid;

    // Also check if there are no items
    const hasNoItems = items.length === 0;

    isNotAllowed =
      hasTransferNeeded || hasDuplicates || hasValidationErrors || hasNoItems;

    return isNotAllowed;
  }
  onSubmit() {
    this.submitAttempted = true;
    this.myForm.markAllAsTouched();

    if (!this.myForm.valid) {
      return;
    }
    if (this.myForm.value.items.length <= 0) {
      this.message.confirmation('Warning', 'No Record To Save');
    } else {
      const duplicates = this.checkDuplicate();
      if (duplicates.isDuplicate) {
        this.message.confirmation(
          'Duplicate Detected',
          'The following Bus Numbers are duplicates: ' +
            duplicates.duplicates
              .map(d => d.bus_num + ' (Depot: ' + d.depot_id + ')')
              .join(', ')
        );
        return;
      }
      const obj = this.myForm.getRawValue().items.map((item: VehicleInfo) => {
        const d = item.effective_date
          ? new DatePipe('en-US').transform(item.effective_date, 'yyyy-MM-dd')
          : null;
        const t = item.effective_time
          ? new DatePipe('en-US').transform(
              new Date(d + ' ' + item.effective_time),
              'HH:mm:ss'
            )
          : null;
        return <VehicleInfo>{
          depot_id: item.depot_id,
          bus_num: item.bus_num,
          svc_prov_id: item.svc_prov_id,
          effective_date: d + ' ' + t,
          group_num: item.group_num,
          updated_on: item.updated_on,
        };
      });

      if (obj.length <= 0) {
        this.message.confirmation('Warning', 'No Record To Save');
      } else if (this.isDelete) {
        const objDelete = this.myForm
          .getRawValue()
          .items.map((item: IVehicleDelete) => {
            return <IVehicleDelete>{
              id: item.id,
              version: item.version,
              depot_id: item.depot_id,
              svc_prov_id: item.svc_prov_id,
              bus_num: item.bus_num,
            };
          });
        this.masterService.delete(objDelete).subscribe({
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
      } else {
        this.masterService.add(obj).subscribe({
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

  handleBusValidate(e: any) {
    return this.commonService.validateBusNumber(e);
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

}
