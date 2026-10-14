import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DialogTableViewBase } from '@app/shared/components/dialog-table-view.base';
import { DIALOG_TABLE_VIEW_IMPORTS } from '@app/shared/components/dialog-table-view.imports';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { FormGroup } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { INewParameterApproval } from '@models/parameter-trial';

@Component({
    selector: 'app-view',
    templateUrl: './view.component.html',
    styleUrls: ['./view.component.scss'],
    providers: [provideNativeDateAdapter()],
    imports: [...DIALOG_TABLE_VIEW_IMPORTS, NgxMatTimepickerModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewComponent extends DialogTableViewBase {
  displayedColumns = ['depot', 'parameter_name', 'parameter_version'];

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
