import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogTableViewBase } from '@app/shared/components/dialog-table-view.base';
import { DIALOG_TABLE_VIEW_IMPORTS } from '@app/shared/components/dialog-table-view.imports';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { FormGroup } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ITrialDeviceSelection } from '@models/parameter-trial';
import { TrialDeviceSelectionService } from '@services/trial-device-selection.service';

import { MatCheckboxModule } from '@angular/material/checkbox';
@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
  providers: [provideNativeDateAdapter()],
  imports: [
    ...DIALOG_TABLE_VIEW_IMPORTS,
    NgxMatTimepickerModule,
    MatCheckboxModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewComponent extends DialogTableViewBase {
  displayedColumns = [
    'depot',
    'bus_num',
    'trial_group',
    'service_group',
    'parameter_group',
  ];

  private readonly trialDeviceSelectionService = inject(
    TrialDeviceSelectionService
  );

  onCheckboxClick(element: FormGroup, controlName: string): void {
    const currentValue = element.get(controlName)?.value;
    element.get(controlName)?.setValue(!currentValue);
  }

  existingItems(element: ITrialDeviceSelection): FormGroup {
    return this.fb.group({
      id: [element.id],
      depot_id: [element.depot_id, { disabled: true }],
      depot: [element.depot || '', { disabled: true }],
      bus_num: [element.bus_num, { disabled: true }],
      svc_provider_id: element.svc_provider_id,
      trial_group: [element.trial_group],
      service_group: [element.service_group],
      parameter_group: [element.parameter_group],
    });
  }

  onSubmit() {
    this.submitRawItems(items =>
      this.trialDeviceSelectionService.manage(items)
    );
  }

  checkAllHandler(event: any, groupType: string) {
    const isChecked = event.checked;
    this.items.controls.forEach(control => {
      control.get(groupType)?.setValue(isChecked);
    });
  }

  // onSubmit() {
  //   this.myForm.markAllAsTouched();
  //   if (this.myForm.valid && this.items.length > 0) {
  //     if (this.myForm.value.items.length <= 0) {
  //       this.message.confirmation('Warning', 'No Record To Save');
  //     } else {
  //       this.trialDeviceSelectionService
  //         .manage(this.myForm.value.items)
  //         .subscribe({
  //           next: (value: PayloadResponse) => {
  //             if (value.status == 201) {
  //               const dialogRef = this.message.confirmation(
  //                 value.status_code,
  //                 value.message
  //               );

  //               dialogRef.afterClosed().subscribe(() => {
  //                 this.dialog.closeAll();
  //               });
  //             } else {
  //               this.store.dispatch(
  //                 showSnackbar({
  //                   message: 'Selected records have been successfully updated!',
  //                   // this.data.action === 'reject'
  //                   //   ? 'Records have been successfully rejected'
  //                   //   : `Records have been successfully ${this.data.action || 'adde'}d!`,

  //                   title: 'Success',
  //                   typeSnackbar: 'success',
  //                 })
  //               );
  //               this.dialog.closeAll();
  //             }
  //           },
  //         });
  //     }
  //   }
  // }
}
