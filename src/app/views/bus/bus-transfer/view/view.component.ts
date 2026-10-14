import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogTableViewBase } from '@app/shared/components/dialog-table-view.base';
import { DIALOG_TABLE_VIEW_IMPORTS } from '@app/shared/components/dialog-table-view.imports';
import { FormGroup } from '@angular/forms';
import {
  MAT_DATE_FORMATS,
  MAT_DATE_LOCALE,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { IBusTransferList } from '@models/bus-transfer';
import { PayloadResponse } from '@models/common';
import { ManageBusTransferService } from '@services/bus-transfer.service';
import { showSnackbar } from '@store/snackbar/snackbar.actions';
import { DD_MM_YYYY_FORMAT } from '@app/shared/utils/date-time';
import { TimeInput24hDirective } from '@app/shared/directives/time-input-24h.directive';

@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
  providers: [
    provideNativeDateAdapter(),
    { provide: MAT_DATE_FORMATS, useValue: DD_MM_YYYY_FORMAT },
    { provide: MAT_DATE_LOCALE, useValue: 'en-GB' },
  ],
  imports: [...DIALOG_TABLE_VIEW_IMPORTS, TimeInput24hDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusTransferViewComponent extends DialogTableViewBase {
  displayedColumns = [
    'bus_num',
    'current_depot',
    'current_operator',
    'current_effective_date',
    'future_depot',
    'future_operator',
    'target_effective_date',
    'target_effective_time',
  ];

  private readonly manageBusTransferService = inject(ManageBusTransferService);

  existingItems(element: IBusTransferList): FormGroup {
    return this.fb.group({
      id: element.id,
      version: element.version,
      //depot_id: [{ value: element.depot_id, disabled: true }],
      bus_num: [{ value: element.bus_num, disabled: true }],
      bus_id: element.bus_id,
      current_depot: [element.current_depot],
      current_depot_name: [element.current_depot_name],
      current_operator: element.current_operator,
      current_operator_name: element.current_operator_name,
      current_effective_date: [
        {
          value: new DatePipe('en-US').transform(
            element.current_effective_date,
            'yyyy-MM-dd HH:mm:ss'
          ),
          disabled: true,
        },
      ],
      future_depot: [element.future_depot],
      future_depot_name: [element.future_depot_name],
      future_operator: element.future_operator,
      future_operator_name: element.future_operator_name,
      target_effective_date: new DatePipe('en-US').transform(
        element.target_effective_date,
        'yyyy-MM-dd'
      ),
      target_effective_time: new DatePipe('en-US').transform(
        element.target_effective_date,
        'HH:mm'
      ),
      future_effective_date: [
        {
          value: new DatePipe('en-US').transform(
            element.future_effective_date,
            'yyyy-MM-dd'
          ),
          disabled: true,
        },
      ],
      status: element.status,
    });
  }

  // timeHandler(time: string, index: number) {
  //   const control = this.items.controls[index];
  //   const date = new DatePipe('en-US').transform(
  //     control.getRawValue().target_effective_date,
  //     'yyyy-MM-dd'
  //   );

  //   // control.patchValue({
  //   //   future_effective_date: new DatePipe('en-US').transform(
  //   //     date + ' ' + time,
  //   //     'yyyy-MM-dd HH:mm:ss'
  //   //   ),
  //   // });
  //   control.patchValue({
  //     target_effective_date: new DatePipe('en-US').transform(
  //       date + ' ' + time,
  //       'yyyy-MM-dd HH:mm:ss'
  //     ),
  //   });
  //   console.log(date);
  //   console.log(control.getRawValue().target_effective_date);
  // }

  reStructureForm(items: any[]) {
    items.forEach((element: any, index: number) => {
      const date = new DatePipe('en-US').transform(
        element.getRawValue().target_effective_date,
        'yyyy-MM-dd'
      );
      element.patchValue({
        target_effective_date: new DatePipe('en-US').transform(
          date + ' ' + element.getRawValue().target_effective_time,
          'yyyy-MM-dd HH:mm:ss'
        ),
      });
    });
  }

  onSubmit() {
    this.reStructureForm(this.items.controls);

    this.myForm.markAllAsTouched();
    if (this.myForm.value.items.length <= 0) {
      this.message.confirmation('Warning', 'No Record To Save');
    } else {
      this.manageBusTransferService
        .manage(this.myForm.getRawValue().items, this.data.action)
        .subscribe({
          next: (_value: PayloadResponse) => {
            this.store.dispatch(
              showSnackbar({
                message:
                  this.data.action === 'reject'
                    ? 'Records have been successfully rejected'
                    : `Records have been successfully ${this.data.action || 'added'}`,
                title: 'Success',
                typeSnackbar: 'success',
              })
            );
            this.dialog.closeAll();
          },
        });
    }
  }
}
