import { AsyncPipe, DatePipe } from '@angular/common';
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
import {
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { INewParameterApproval } from '@models/parameter-trial';
import { IDepoList } from '@models/depo';
import { DepoRequest, PayloadResponse } from '@models/common';
import { DepoService } from '@services/depo.service';

import { MessageService } from '@services/message.service';
import { AppStore } from '@store/app.state';
import { Store } from '@ngrx/store';

import { HttpErrorResponse } from '@angular/common/http';
import { ParameterService } from '@app/services/parameter.service';
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
    // MatIcon,
    // AsyncPipe,
    DatePipe,
    MatDividerModule,
    MatDialogActions,
    MatDialogContent,
    MatDialogClose,
    MatTableModule,
    MatIconModule,
    MatDatepickerModule,
    MatTooltipModule,
    NgxMatTimepickerModule,
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
  params: DepoRequest = {
    patternSearch: false,
    search_text: '',
    is_pattern_search: false,
    page_size: 100,
    page_index: 0,
    sort_order: [],
  };
  displayedColumns = [
    'depot',
    'parameter_name',
    'parameter_version',
    'effective_date_time',
  ];

  constructor(
    private fb: FormBuilder,
    public dialog: MatDialog,
    private depoService: DepoService,
    private parameterService: ParameterService,
    private message: MessageService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<ViewComponent>,
    private store: Store<AppStore>
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
    }
  }

  OnDestroy(): void {
    this.dialog.closeAll();
  }

  get items(): FormArray {
    return this.myForm.get('items') as FormArray;
  }

  existingItems(element: any): FormGroup {
    const depot = this.depots.find(_d => _d.depot_id === element.depot_id);
    return this.fb.group({
      id: element.param_master_id,
      param_master_id: element.param_master_id,
      version: element.version,
      status_code: element.status_code,
      status_desc: element.status_desc,
      last_update: element.last_update,
      depot_id: [{ value: element.depot_id, disabled: true }],
      depot: [{ value: depot?.depot_name ?? null, disabled: true }],
      parameter_name: [{ value: element.parameter_name, disabled: true }],
      parameter_version: [{ value: element.parameter_version, disabled: true }],
      effective_date_time: [
        { value: element.effective_date_time, disabled: true },
      ],
      svc_prov_id: element.svc_prov_id,
    });
  }

  reRenderTable(): void {
    if (this._matTable != undefined) {
      this._matTable.renderRows();
      this.rowCount = this.items.length;
    }
  }

  onSubmit() {
    this.myForm.markAllAsTouched();
    if (this.myForm.valid && this.items.length > 0) {
      if (this.myForm.value.items.length <= 0) {
        this.message.confirmation('Warning', 'No Record To Save');
      } else {
        this.parameterService
          .manage(this.myForm.getRawValue().items, this.data.action)
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
