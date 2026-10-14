import { Directive, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { ImportDialogComponent } from '@app/components/import-dialog/import-dialog.component';
import { PayloadResponse } from '@app/models/common';
import {
  DepotFileList,
  IDepotFileList,
} from '@app/models/parameter-management';
import { ManageDailyBusListService } from '@app/services/manage-daily-bus-list.service';
import { showSnackbar } from '@app/store/snackbar/snackbar.actions';
import { DialogTableViewBase } from './dialog-table-view.base';

/**
 * Shared behaviour for the "import file per depot" dialogs (parameter file
 * import and message data import); subclasses only provide the template.
 */
@Directive()
export abstract class DepotFileImportViewBase extends DialogTableViewBase {
  isUpdate: boolean = false;
  isDelete: boolean = false;
  depotId: string;
  displayedColumns = ['depot_id', 'browse_file'];

  private readonly manageDailyBusListService = inject(
    ManageDailyBusListService
  );

  constructor() {
    super();
    this.depoService.depo$
      .pipe(takeUntilDestroyed())
      .subscribe((value: string) => {
        this.depotId = value;
      });
  }

  override ngOnInit(): void {
    if (this.initForm().length === 0) {
      this.addItem();
      return;
    }
    if (this.data.action === 'delete') {
      this.isDelete = true;
      this.displayedColumns.pop();
    } else {
      this.isUpdate = true;
    }
    this.rowCount = this.items.length;
  }

  importHandler(event: any, index: number) {
    if (event.target.files.length) {
      const fileList = event.target.files;
      const formData = new FormData();
      const itemGroup = this.items.at(index) as FormGroup;
      const fileNameControl = itemGroup.get('fileName');
      for (const file of Array.from(fileList) as File[]) {
        formData.append('file', file);

        fileNameControl?.setValue(file.name);
      }
    }
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
    if (!this.myForm.valid || this.items.length === 0) {
      return;
    }
    if (this.myForm.value.items.length <= 0) {
      this.message.confirmation('Warning', 'No Record To Save');
      return;
    }
    this.manageDailyBusListService
      .manage(this.myForm.value.items, this.data.action)
      .subscribe({
        next: (value: PayloadResponse) => this.onImported(value),
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

  private onImported(value: PayloadResponse): void {
    if (value.status == 201) {
      this.message.confirmation(value.status_code, value.message);
      return;
    }
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
}
