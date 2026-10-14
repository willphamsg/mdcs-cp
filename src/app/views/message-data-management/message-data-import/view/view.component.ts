import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DepotFileImportViewBase } from '@app/shared/components/depot-file-import-view.base';
import { DIALOG_TABLE_VIEW_IMPORTS } from '@app/shared/components/dialog-table-view.imports';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { provideNativeDateAdapter } from '@angular/material/core';

@Component({
  selector: 'app-view',
  templateUrl: './view.component.html',
  styleUrls: ['./view.component.scss'],
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [...DIALOG_TABLE_VIEW_IMPORTS, NgxMatTimepickerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewComponent extends DepotFileImportViewBase {
  override rowCount = 0;
}
