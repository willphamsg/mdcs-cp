import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '@app/components/confirmation-dialog/confirmation-dialog.component';
import { Store } from '@ngrx/store';
import { MessageService } from './message.service';

describe('MessageService', () => {
  let service: MessageService;
  let dialogSpy: jasmine.SpyObj<MatDialog>;
  let storeSpy: jasmine.SpyObj<Store>;

  beforeEach(() => {
    const dialogMock = jasmine.createSpyObj('MatDialog', ['open']);
    const storeMock = jasmine.createSpyObj('Store', ['dispatch']);

    TestBed.configureTestingModule({
      providers: [
        MessageService,
        { provide: MatDialog, useValue: dialogMock },
        { provide: Store, useValue: storeMock },
      ],
    });

    service = TestBed.inject(MessageService);
    dialogSpy = TestBed.inject(MatDialog) as jasmine.SpyObj<MatDialog>;
    storeSpy = TestBed.inject(Store) as jasmine.SpyObj<Store>;
  });

  it('should dispatch a snackbar message for multiError', () => {
    const mockError = new HttpErrorResponse({
      error: { errors: [{ message: 'test 1' }, { message: 'test 2' }] },
      status: 400,
    });

    service.multiError(mockError).subscribe({
      error: err => {
        expect(storeSpy.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({
            message: 'test 1,test 2',
            title: 'Error',
            typeSnackbar: 'error',
          })
        );
        expect(err).toBe(mockError);
      },
    });
  });

  it('should open a confirmation dialog', () => {
    service.confirmation('test', 'test');
    expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, {
      height: '30%',
      width: '25%',
      data: jasmine.objectContaining({
        title: 'test',
        message: 'test',
        multiMessage: [],
        okOnly: true,
      }),
    });
  });

  it('should open a warning dialog ', () => {
    service.warning('test', 'test');
    expect(dialogSpy.open).toHaveBeenCalledWith(ConfirmationDialogComponent, {
      height: '30%',
      width: '25%',
      data: jasmine.objectContaining({
        title: 'test',
        message: 'test',
        multiMessage: [],
        okOnly: false,
      }),
    });
  });
});
