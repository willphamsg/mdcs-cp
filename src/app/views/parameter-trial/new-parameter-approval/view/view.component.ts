import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogTableViewBase } from '@app/shared/components/dialog-table-view.base';
import { DIALOG_TABLE_VIEW_IMPORTS } from '@app/shared/components/dialog-table-view.imports';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { FormGroup } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';
import { INewParameterApproval } from '@models/parameter-trial';
import { ParameterService } from '@app/services/parameter.service';

import { generateUniqueNumberId } from '@app/shared/utils/utils';
@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
  providers: [provideNativeDateAdapter()],
  imports: [...DIALOG_TABLE_VIEW_IMPORTS, NgxMatTimepickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewComponent extends DialogTableViewBase {
  displayedColumns = [
    'depot',
    'parameter_name',
    'parameter_version',
    'effective_date_time',
  ];

  private readonly parameterService = inject(ParameterService);

  existingItems(element: INewParameterApproval): FormGroup {
    return this.fb.group({
      id: element.id ?? generateUniqueNumberId(), // Keep original ID for backend submission
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
    });
  }

  onSubmit() {
    this.submitRawItems(items =>
      this.parameterService.manage(items, this.data.action)
    );
  }
}
