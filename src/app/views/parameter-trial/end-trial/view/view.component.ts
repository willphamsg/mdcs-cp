import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DialogTableViewBase } from '@app/shared/components/dialog-table-view.base';
import { DIALOG_TABLE_VIEW_IMPORTS } from '@app/shared/components/dialog-table-view.imports';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { FormGroup } from '@angular/forms';
import { provideNativeDateAdapter } from '@angular/material/core';

import { ParameterService } from '@app/services/parameter.service';
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

  onSubmit() {
    this.submitRawItems(items =>
      this.parameterService.manage(items, this.data.action)
    );
  }
}
