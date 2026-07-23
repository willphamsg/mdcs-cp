import { DatePipe } from '@angular/common';
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
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import {
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import {
  INewParameterApproval,
  IValidationScenarioDetails,
  IParameterModeActionRequest,
  TUserActionType,
} from '@models/parameter-trial';
import { IDepoList } from '@models/depo';
import { DepoRequest, PayloadResponse } from '@models/common';
import { DepoService } from '@services/depo.service';
import { ParameterService } from '@app/services/parameter.service';

import { MessageService } from '@services/message.service';

import { HttpErrorResponse } from '@angular/common/http';
import { generateUniqueNumberId } from '@app/shared/utils/utils';
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
    DatePipe,
    MatDividerModule,
    MatDialogActions,
    MatDialogContent,
    MatTableModule,
    MatDatepickerModule,
    MatTooltipModule,
    NgxMatTimepickerModule,
    MatRadioModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewComponent implements OnInit {
  @ViewChild(MatTable) _matTable: MatTable<any>;
  myForm: FormGroup;
  mode: string = '';
  rowCount: number = 1;
  depots: IDepoList[] = [];
  isEdit: boolean = false;
  currentAction: string = 'live';
  params: DepoRequest = {
    patternSearch: false,
    search_text: '',
    is_pattern_search: false,
    page_size: 100,
    page_index: 0,
    sort_order: [],
  };
  readonly baseColumns = [
    'depot',
    'parameter_name',
    'parameter_version',
    'effective_date_time',
  ];
  displayedColumns = [...this.baseColumns, 'remark'];

  remark?: string;
  userActionType: TUserActionType = 'NONE'; // Used for footer actions only
  readonly remarkColumn = 'remark';
  readonly decisionColumn = 'decision';

  constructor(
    private readonly fb: FormBuilder,
    public dialog: MatDialog,
    private readonly parameterService: ParameterService,
    private readonly depoService: DepoService,
    private readonly message: MessageService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<ViewComponent>
  ) {
    this.depoService.depoList$.subscribe((value: IDepoList[]) => {
      this.depots = value;
    });
  }

  title: string;

  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  ngOnInit(): void {
    this.title = this.data.title;
    this.remark = this.data?.remark;
    this.currentAction = this.data?.action || 'live';

    this.myForm = this.fb.group({
      items: this.fb.array([]),
    });

    if (this.data != null && this.data.selection?.length > 0) {
      this.data.selection.forEach((element: any) => {
        this.items.push(this.existingItems(element));
      });
      this.mode = this.data.action;
      this.rowCount = this.items.length;
      this.isEdit = this.data?.action === 'update';
      this.updateDisplayedColumns();
      // Set global userActionType for footer actions (use first item's type or NONE)
      this.userActionType =
        this.items.controls[0]?.get('user_action_type')?.value ?? 'NONE';
    }
  }

  OnDestroy(): void {
    this.dialog.closeAll();
  }

  get items(): FormArray {
    return this.myForm.get('items') as FormArray;
  }

  existingItems(
    element: INewParameterApproval & {
      scenario_details?: IValidationScenarioDetails;
    }
  ): FormGroup {
    const userActionType =
      element?.scenario_details?.user_action_type ?? 'NONE';
    return this.fb.group({
      id: element.id ?? generateUniqueNumberId(),
      version: element.version,
      status: element.status_code,
      updated_on: element.last_update,
      depot_id: [{ value: element.depot_id, disabled: true }],
      depot: [{ value: element.depot_name, disabled: true }],
      parameter_name: [{ value: element.parameter_name, disabled: true }],
      parameter_version: [{ value: element.parameter_version, disabled: true }],
      effective_date_time: [
        { value: element.effective_date_time, disabled: true },
      ],
      svc_prov_id: element.svc_prov_id,
      param_master_id: element.param_master_id,
      scenario_message: [
        { value: element?.scenario_details?.message || '', disabled: true },
      ],
      user_action_type: userActionType,
      scenario_id: element?.scenario_details?.scenario_id,
      scenario_decision:
        userActionType === 'YES_NO' ? 'YES' : { value: '', disabled: true },
    });
  }

  reRenderTable(): void {
    if (this._matTable != undefined) {
      this._matTable.renderRows();
      this.rowCount = this.items.length;
    }
  }

  onSubmit(ackOverride?: boolean) {
    this.submitParameterModeAction(ackOverride);
  }

  onClose(result: 'cancel' | 'no' | 'ok' = 'cancel'): void {
    this.dialogRef.close(result);
  }

  onAcknowledge(): void {
    this.submitParameterModeAction(true);
  }

  get showDefaultActions(): boolean {
    return this.userActionType === 'NONE';
  }

  get showYesNoActions(): boolean {
    return this.userActionType === 'YES_NO';
  }

  get showOkAction(): boolean {
    return this.userActionType === 'OK';
  }

  showDecisionColumnForItem(element: FormGroup): boolean {
    const userActionType = element.get('user_action_type')?.value ?? 'NONE';
    return userActionType === 'YES_NO';
  }

  getDisplayMessage(element: FormGroup): string {
    const message = element.get('scenario_message')?.value || '';
    const userActionType = element.get('user_action_type')?.value ?? 'NONE';
    const scenarioId = element.get('scenario_id')?.value;

    // Return empty content if userActionType is NONE and scenario_id is 8 or 15 or 17
    if (
      userActionType === 'NONE' &&
      (scenarioId === 8 || scenarioId === 15 || scenarioId === 17)
    ) {
      return '';
    }

    if (message) {
      return message;
    }

    if (userActionType === 'NONE') {
      return 'Please act on the Trial version first.';
    }

    return '—';
  }

  hasDisplayMessage(element: FormGroup): boolean {
    const message = this.getDisplayMessage(element);
    return message !== '';
  }

  private updateDisplayedColumns(): void {
    // Check if any item has YES_NO action type to show decision column
    const hasYesNoItem = this.items.controls.some(
      control => control.get('user_action_type')?.value === 'YES_NO'
    );
    this.displayedColumns = [...this.baseColumns, this.remarkColumn];
    if (hasYesNoItem) {
      this.displayedColumns.push(this.decisionColumn);
    }
  }

  private submitParameterModeAction(ackOverride?: boolean): void {
    this.myForm.markAllAsTouched();

    if (!this.myForm.valid || this.items.length === 0) {
      this.message.confirmation('Warning', 'No Record To Save');
      return;
    }

    const payload = this.buildActionRequestPayload(ackOverride);
    if (!payload.length) {
      this.message.confirmation('Warning', 'No Record To Save');
      return;
    }

    const action$ =
      this.currentAction === 'trial'
        ? this.parameterService.trial(payload)
        : this.parameterService.live(payload);

    action$.subscribe({
      next: (value: PayloadResponse) => {
        const resp = this.message.MessageResponse(value, false);
        if (resp) {
          this.dialogRef.close('submit');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.message.multiError(err);
      },
    });
  }

  private buildActionRequestPayload(
    ackOverride?: boolean
  ): IParameterModeActionRequest[] {
    return this.items.controls.map(control => {
      const value = control.getRawValue();
      const userActionType = value.user_action_type ?? 'NONE';
      return {
        parameter_status: {
          param_master_id: value.param_master_id,
          depot_id: Number(value.depot_id),
          parameter_name: value.parameter_name,
          parameter_version: value.parameter_version,
          effective_date_time: value.effective_date_time,
        },
        scenario_reply: {
          acknowledged: this.resolveAcknowledgement(
            value.scenario_decision,
            ackOverride,
            userActionType
          ),
        },
      };
    });
  }

  private resolveAcknowledgement(
    decision?: string,
    ackOverride?: boolean,
    userActionType: TUserActionType = 'NONE'
  ): boolean {
    if (typeof ackOverride === 'boolean') {
      return ackOverride;
    }

    if (userActionType === 'YES_NO') {
      return (decision || 'YES').toUpperCase() === 'YES';
    }

    if (userActionType === 'OK') {
      return false;
    }

    return true;
  }
}
