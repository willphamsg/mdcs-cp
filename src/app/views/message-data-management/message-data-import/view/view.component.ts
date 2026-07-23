import {
  CommonModule,
} from '@angular/common';
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
  FormsModule,
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
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { MatTable, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { DepoRequest, DropdownList, PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import {
  DepotFileList,
  IDepotFileList,
} from '@app/models/parameter-management';
import { DepoService } from '@app/services/depo.service';
import { ManageDailyBusListService } from '@app/services/manage-daily-bus-list.service';
import { MessageService } from '@app/services/message.service';
import { AppStore } from '@app/store/app.state';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';
import { Store } from '@ngrx/store';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { ImportDialogComponent } from '@app/components/import-dialog/import-dialog.component';

@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
  standalone: true,
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
    NgxMatTimepickerModule,
    FormsModule,
    CommonModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewComponent implements OnInit {
  @ViewChild(MatTable) _matTable: MatTable<any>;
  myForm: FormGroup;
  isUpdate: boolean = false;
  isDelete: boolean = false;
  rowCount: number = 0;
  depotId: string;
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
  displayedColumns = ['depot_id', 'browse_file'];
  isDisabled: boolean = false;

  constructor(
    private readonly fb: FormBuilder,
    public dialog: MatDialog,
    private readonly manageDailyBusListService: ManageDailyBusListService,
    private readonly depoService: DepoService,
    private readonly message: MessageService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<ViewComponent>,
    private readonly _snackBar: MatSnackBar,
    private readonly store: Store<AppStore>
  ) {
    this.depoService.depo$.subscribe((value: string) => {
      this.depotId = value;
    });
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
      if (this.data.action === 'delete') {
        this.isDelete = true;
        this.displayedColumns.pop();
      } else {
        this.isUpdate = true;
      }

      this.data.selection.forEach((element: any) => {
        this.items.push(this.existingItems(element));
      });
      this.rowCount = this.items.length;
    } else {
      this.addItem();
    }
  }

  importHandler(event: any, index: number) {
    if (event.target.files.length) {
      const fileList = event.target.files;
      const formData = new FormData();
      const itemGroup = this.items.at(index) as FormGroup;
      const fileNameControl = itemGroup.get('fileName');
      for (const file of fileList) {
        formData.append('file', file);

        fileNameControl?.setValue(file.name);
      }
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

  existingItems(element: IDepotFileList): FormGroup {
    return this.fb.group({
      depot: element.depot,
      fileName: element.fileName,
    });
  }

  newItems(): FormGroup {
    return this.fb.group(new DepotFileList());
  }

  addItem() {
    const newItem = this.newItems();
    newItem.controls['depot'].setValue(this.depotId);
    this.items.push(newItem);

    this.reRenderTable();
  }

  removeItem(i: number) {
    if (this.items.length > 1) {
      this.items.removeAt(i);
      this.reRenderTable();
    }
  }

  reRenderTable(): void {
    if (this._matTable != undefined) {
      this._matTable.renderRows();
      this.rowCount = this.items.length;
    }
  }

  onSubmit() {
    this.dialog.open(ImportDialogComponent, {
      width: '100%',
      height: '100%',
      maxHeight: '266px',
      maxWidth: '420px',
      panelClass: ['download-dialog'],
      autoFocus: 'first-heading',
      disableClose: true,
      data: {
        progress: '100',
        totol: '100',
      },
    });

    this.myForm.markAllAsTouched();
    if (this.myForm.valid && this.items.length > 0) {
      if (this.myForm.value.items.length <= 0) {
        this.message.confirmation('Warning', 'No Record To Save');
      } else {
        this.manageDailyBusListService
          .manage(this.myForm.value.items, this.data.action)
          .subscribe({
            next: (value: PayloadResponse) => {
              if (value.status == 201) {
                this.message.confirmation(
                  value.status_code,
                  value.message
                );
                // dialogRef.afterClosed().subscribe(() => {
                //   this.dialog.closeAll();
                // });
              } else {
                // const dialogRef = this.message.confirmation(
                //   value.status_code,
                //   value.message
                // );
                // dialogRef.afterClosed().subscribe(() => {
                //   this.dialog.closeAll();
                // });

                setTimeout(() => {
                  this.dialog.closeAll();

                  this.store.dispatch(
                    showSnackbar({
                      message: `2 records have been successfully imported!`,
                      title: 'Success',
                      typeSnackbar: 'success',
                    })
                  );
                }, 10000);
              }
            },
            error: () => {
              this.store.dispatch(
                showSnackbar({
                  message: 'Something went wrong!',
                  title: 'Error',
                  typeSnackbar: 'error',
                })
              );
            },
          });
      }
    }
  }
}
