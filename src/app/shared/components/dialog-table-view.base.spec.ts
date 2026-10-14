import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { FormGroup } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { DepoService } from '@app/services/depo.service';
import { ManageDailyBusListService } from '@app/services/manage-daily-bus-list.service';
import { MessageService } from '@app/services/message.service';
import { Store } from '@ngrx/store';
import { Observable, of, throwError } from 'rxjs';
import { DepotFileImportViewBase } from './depot-file-import-view.base';
import { DialogTableViewBase } from './dialog-table-view.base';

@Component({ selector: 'app-test-table-view', template: '' })
class TestTableViewComponent extends DialogTableViewBase {
  existingItems(element: any): FormGroup {
    return this.fb.group({ id: element.id });
  }

  submit(save: (items: any[]) => Observable<any>): void {
    this.submitRawItems(save);
  }
}

@Component({ selector: 'app-test-import-view', template: '' })
class TestImportViewComponent extends DepotFileImportViewBase {}

describe('DialogTableViewBase', () => {
  let dialog: jasmine.SpyObj<MatDialog>;
  let message: jasmine.SpyObj<MessageService>;
  let store: jasmine.SpyObj<Store<any>>;
  let manageService: jasmine.SpyObj<ManageDailyBusListService>;

  function setup<T>(component: new () => T, data: any): T {
    dialog = jasmine.createSpyObj('MatDialog', ['closeAll', 'open']);
    message = jasmine.createSpyObj('MessageService', [
      'confirmation',
      'MessageResponse',
      'multiError',
    ]);
    store = jasmine.createSpyObj('Store', ['dispatch']);
    manageService = jasmine.createSpyObj('ManageDailyBusListService', [
      'manage',
    ]);
    TestBed.configureTestingModule({
      providers: [
        { provide: MatDialog, useValue: dialog },
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MessageService, useValue: message },
        { provide: Store, useValue: store },
        { provide: ManageDailyBusListService, useValue: manageService },
        {
          provide: DepoService,
          useValue: {
            depo$: of('D1'),
            depoList$: of([{ depot_id: 'D1', depot_name: 'Depot One' }]),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  describe('selection dialogs', () => {
    it('fills the form from the selection and flags update mode', () => {
      const component = setup(TestTableViewComponent, {
        title: 'Edit',
        action: 'update',
        selection: [{ id: 1 }, { id: 2 }],
      });

      expect(component.title).toBe('Edit');
      expect(component.items).toHaveSize(2);
      expect(component.rowCount).toBe(2);
      expect(component.isEdit).toBeTrue();
      expect(component.depots).toHaveSize(1);
    });

    it('leaves the form empty when nothing is selected', () => {
      const component = setup(TestTableViewComponent, { title: 'Add' });

      expect(component.items).toHaveSize(0);
      expect(component.mode).toBe('');
    });

    it('does not save when there are no rows', () => {
      const component = setup(TestTableViewComponent, { title: 'Add' });
      const save = jasmine.createSpy('save');

      component.submit(save);

      expect(save).not.toHaveBeenCalled();
    });

    it('closes the dialogs once the save is confirmed', () => {
      const component = setup(TestTableViewComponent, {
        action: 'update',
        selection: [{ id: 1 }],
      });
      message.MessageResponse.and.returnValue(true);
      const save = jasmine.createSpy('save').and.returnValue(of({}));

      component.submit(save);

      expect(save).toHaveBeenCalledWith([{ id: 1 }]);
      expect(dialog.closeAll).toHaveBeenCalled();
    });

    it('keeps the dialog open when the save is not confirmed', () => {
      const component = setup(TestTableViewComponent, {
        selection: [{ id: 1 }],
      });
      message.MessageResponse.and.returnValue(false);

      component.submit(() => of({}));

      expect(dialog.closeAll).not.toHaveBeenCalled();
    });

    it('reports save errors', () => {
      const component = setup(TestTableViewComponent, {
        selection: [{ id: 1 }],
      });
      const error = new Error('boom');

      component.submit(() => throwError(() => error));

      expect(message.multiError).toHaveBeenCalledWith(error as any);
    });

    it('closes all dialogs on destroy', () => {
      const component = setup(TestTableViewComponent, {});

      component.ngOnDestroy();

      expect(dialog.closeAll).toHaveBeenCalled();
    });
  });

  describe('depot file import dialogs', () => {
    it('starts with one row for the current depot when adding', () => {
      const component = setup(TestImportViewComponent, { title: 'Import' });

      expect(component.items).toHaveSize(1);
      expect(component.items.at(0).value.depot).toBe('D1');
      expect(component.getDepotName('D1')).toBe('Depot One');
    });

    it('drops the browse column when deleting', () => {
      const component = setup(TestImportViewComponent, {
        action: 'delete',
        selection: [{ depot: 'D1', fileName: 'a.dat' }],
      });

      expect(component.isDelete).toBeTrue();
      expect(component.displayedColumns).toEqual(['depot_id']);
      expect(component.rowCount).toBe(1);
    });

    it('flags update mode for other actions', () => {
      const component = setup(TestImportViewComponent, {
        action: 'update',
        selection: [{ depot: 'D1', fileName: 'a.dat' }],
      });

      expect(component.isUpdate).toBeTrue();
    });

    it('records the chosen file name', () => {
      const component = setup(TestImportViewComponent, {});
      const file = new File(['x'], 'params.dat');

      component.importHandler({ target: { files: [file] } }, 0);

      expect(component.items.at(0).getRawValue().fileName).toBe('params.dat');
    });

    it('only removes a row while more than one remains', () => {
      const component = setup(TestImportViewComponent, {});
      component.addItem();

      component.removeItem(0);
      component.removeItem(0);

      expect(component.items).toHaveSize(1);
    });

    it('asks for confirmation when the import returns 201', () => {
      const component = setup(TestImportViewComponent, {
        selection: [{ depot: 'D1', fileName: 'a.dat' }],
      });
      manageService.manage.and.returnValue(
        of({ status: 201, status_code: 'OK', message: 'Queued' } as any)
      );

      component.onSubmit();

      expect(message.confirmation).toHaveBeenCalledWith('OK', 'Queued');
    });

    it('closes the dialogs and reports success after other responses', fakeAsync(() => {
      const component = setup(TestImportViewComponent, {
        selection: [{ depot: 'D1', fileName: 'a.dat' }],
      });
      manageService.manage.and.returnValue(of({ status: 200 } as any));

      component.onSubmit();
      tick(10000);

      expect(dialog.closeAll).toHaveBeenCalled();
      expect(store.dispatch).toHaveBeenCalled();
    }));

    it('reports import errors', () => {
      const component = setup(TestImportViewComponent, {
        selection: [{ depot: 'D1', fileName: 'a.dat' }],
      });
      manageService.manage.and.returnValue(throwError(() => new Error('x')));

      component.onSubmit();

      expect(store.dispatch).toHaveBeenCalled();
    });

    it('does not import when the form has no rows', () => {
      const component = setup(TestImportViewComponent, {});
      component.items.clear();

      component.onSubmit();

      expect(manageService.manage).not.toHaveBeenCalled();
    });
  });
});
