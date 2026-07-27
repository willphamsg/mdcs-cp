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

  it('should use err.error.message directly when status is 0', () => {
    const mockError = new HttpErrorResponse({
      error: { message: 'network down' },
      status: 0,
    });

    service.multiError(mockError).subscribe({
      error: err => {
        expect(storeSpy.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({
            message: 'network down',
            title: 'Error',
            typeSnackbar: 'error',
          })
        );
        expect(err).toBe(mockError);
      },
    });
  });

  it('should dispatch "System is offline" when status is 500 and no body', () => {
    const mockError = new HttpErrorResponse({
      status: 500,
      statusText: 'Internal Server Error',
    });

    service.multiError(mockError).subscribe({
      error: err => {
        expect(storeSpy.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({
            message: 'System is offline',
            title: 'Error',
            typeSnackbar: 'error',
          })
        );
        expect(err).toBe(mockError);
      },
    });
  });

  it('should rethrow without dispatching a snackbar for 403 Forbidden with no body', () => {
    const mockError = new HttpErrorResponse({
      status: 403,
      statusText: 'Forbidden',
    });

    service.multiError(mockError).subscribe({
      error: err => {
        expect(storeSpy.dispatch).not.toHaveBeenCalled();
        expect(err).toBe(mockError);
      },
    });
  });

  it('should dispatch a generic snackbar for other statuses with no body', () => {
    const mockError = new HttpErrorResponse({
      status: 418,
      statusText: "I'm a teapot",
    });

    service.multiError(mockError).subscribe({
      error: err => {
        expect(storeSpy.dispatch).toHaveBeenCalledWith(
          jasmine.objectContaining({
            message: mockError.message,
            title: 'Error',
            typeSnackbar: 'error',
          })
        );
        expect(err).toBe(mockError);
      },
    });
  });

  it('should return false from MessageResponse when the status is unknown', () => {
    const result = service.MessageResponse(
      {
        status: 999,
        status_code: 'UNKNOWN',
        timestamp: Date.now(),
        message: 'unknown status',
        payload: null,
      },
      false
    );

    expect(result).toBeFalse();
    expect(storeSpy.dispatch).not.toHaveBeenCalled();
  });

  it('should dispatch a snackbar from MessageResponse when the status is known', () => {
    const result = service.MessageResponse(
      {
        status: 200,
        status_code: 'OK',
        timestamp: Date.now(),
        message: 'all good',
        payload: null,
      },
      false
    );

    expect(result).toBeTrue();
    expect(storeSpy.dispatch).toHaveBeenCalledWith(
      jasmine.objectContaining({
        message: 'all good',
        title: 'Success',
        typeSnackbar: 'success',
      })
    );
  });

  it('should concatenate multiple error messages in singleError', () => {
    const mockError = new HttpErrorResponse({
      error: { errors: [{ message: 'part 1' }, { message: 'part 2' }] },
      status: 400,
    });

    service.singleError(mockError).subscribe({
      error: err => {
        expect(dialogSpy.open).toHaveBeenCalledWith(
          ConfirmationDialogComponent,
          {
            height: '25%',
            width: '20%',
            data: jasmine.objectContaining({
              title: 'Error',
              message: 'part 1part 2',
              multiMessage: [],
              okOnly: true,
            }),
          }
        );
        expect(err).toBe(mockError);
      },
    });
  });
});
