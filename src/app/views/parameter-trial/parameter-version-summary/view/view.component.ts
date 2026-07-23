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
import { MatIconModule } from '@angular/material/icon';
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
import { DepoRequest } from '@models/common';
import { DepoService } from '@services/depo.service';
import { ParameterService } from '@app/services/parameter.service';

import { MessageService } from '@services/message.service';
import { AppStore } from '@store/app.state';
import { Store } from '@ngrx/store';
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
    changeDetection: ChangeDetectionStrategy.OnPush
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
  displayedColumns = ['depot', 'parameter_name', 'parameter_version'];

  constructor(
    private readonly fb: FormBuilder,
    public readonly dialog: MatDialog,
    private readonly parameterService: ParameterService,
    private readonly depoService: DepoService,
    private readonly message: MessageService,
    @Inject(MAT_DIALOG_DATA) public readonly data: any,
    public readonly dialogRef: MatDialogRef<ViewComponent>,
    private readonly store: Store<AppStore>
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

  existingItems(element: INewParameterApproval): FormGroup {
    return this.fb.group({
      id: element.id,
      version: element.version,
      depot_id: [{ value: element.depot_id, disabled: true }],
      depot: [{ value: element.depot?.depot_name, disabled: true }],
      parameter_name: [{ value: element.parameter_name, disabled: true }],
      parameter_version: [{ value: element.parameter_version, disabled: true }],
    });
  }

  reRenderTable(): void {
    if (this._matTable != undefined) {
      this._matTable.renderRows();
      this.rowCount = this.items.length;
    }
  }

  onSubmit() {
    // this.myForm.markAllAsTouched();
    // if (this.myForm.valid && this.items.length > 0) {
    //   if (this.myForm.value.items.length <= 0) {
    //     this.message.confirmation('Warning', 'No Record To Save');
    //   } else {
    //     this.newParameterApprovalService
    //       .manage(this.myForm.value.items)
    //       .subscribe({
    //         next: (value: PayloadResponse) => {
    //           if (value.status == 201) {
    //             const dialogRef = this.message.confirmation(
    //               value.status_code,
    //               value.message
    //             );

    //             dialogRef.afterClosed().subscribe(() => {
    //               this.dialog.closeAll();
    //             });
    //           } else {
    //             this.store.dispatch(
    //               showSnackbar({
    //                 message: 'Selected records have been successfully updated!',
    //                 // this.data.action === 'reject'
    //                 //   ? 'Records have been successfully rejected'
    //                 //   : `Records have been successfully ${this.data.action || 'adde'}d!`,

    //                 title: 'Success',
    //                 typeSnackbar: 'success',
    //               })
    //             );
    //             this.dialog.closeAll();
    //           }
    //         },
    //       });
    //   }
    // }
  }
}
