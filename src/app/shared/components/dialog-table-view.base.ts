import { HttpErrorResponse } from '@angular/common/http';
import { Directive, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { MatTable } from '@angular/material/table';
import { DepoRequest, PayloadResponse } from '@app/models/common';
import { IDepoList } from '@app/models/depo';
import { DepoService } from '@app/services/depo.service';
import { MessageService } from '@app/services/message.service';
import { AppStore } from '@app/store/app.state';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

/**
 * Shared state and behaviour for the dialog views that edit a table of
 * selected rows (bus transfer, parameter trial and file import dialogs).
 */
@Directive()
export abstract class DialogTableViewBase implements OnInit, OnDestroy {
  @ViewChild(MatTable) _matTable: MatTable<any>;
  myForm: FormGroup;
  mode: string = '';
  isEdit: boolean = false;
  rowCount: number = 1;
  depots: IDepoList[] = [];
  title: string;
  params: DepoRequest = {
    patternSearch: false,
    search_text: '',
    is_pattern_search: false,
    page_size: 100,
    page_index: 0,
    sort_order: [],
  };
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'top';

  protected readonly fb = inject(FormBuilder);
  public readonly dialog = inject(MatDialog);
  protected readonly depoService = inject(DepoService);
  protected readonly message = inject(MessageService);
  protected readonly store = inject<Store<AppStore>>(Store);
  public readonly data: any = inject(MAT_DIALOG_DATA);
  public readonly dialogRef = inject(MatDialogRef);

  constructor() {
    this.depoService.depoList$
      .pipe(takeUntilDestroyed())
      .subscribe((value: IDepoList[]) => {
        this.depots = value;
      });
  }

  abstract existingItems(element: any): FormGroup;

  ngOnInit(): void {
    const selection = this.initForm();
    if (selection.length === 0) {
      return;
    }
    this.mode = this.data.action;
    this.rowCount = this.items.length;
    this.isEdit = this.mode === 'update';
  }

  /**
   * Builds the empty items form and fills it from the dialog's selected
   * rows; returns that selection so subclasses can branch on it.
   */
  protected initForm(): any[] {
    this.title = this.data.title;
    this.myForm = this.fb.group({ items: this.fb.array([]) });
    const selection: any[] = this.data.selection ?? [];
    for (const element of selection) {
      this.items.push(this.existingItems(element));
    }
    return selection;
  }

  ngOnDestroy(): void {
    this.dialog.closeAll();
  }

  get items(): FormArray {
    return this.myForm.get('items') as FormArray;
  }

  reRenderTable(): void {
    if (this._matTable != undefined) {
      this._matTable.renderRows();
      this.rowCount = this.items.length;
    }
  }

  /**
   * Validates the form, then sends the raw item values through `save` and
   * closes the dialogs once the backend confirms the change.
   */
  protected submitRawItems(
    save: (items: any[]) => Observable<PayloadResponse>
  ): void {
    this.myForm.markAllAsTouched();
    if (!this.myForm.valid || this.items.length === 0) {
      return;
    }
    if (this.myForm.value.items.length <= 0) {
      this.message.confirmation('Warning', 'No Record To Save');
      return;
    }
    save(this.myForm.getRawValue().items).subscribe({
      next: (value: PayloadResponse) => {
        if (this.message.MessageResponse(value, false)) {
          this.dialog.closeAll();
        }
      },
      error: (err: HttpErrorResponse) => {
        this.message.multiError(err);
      },
    });
  }
}
