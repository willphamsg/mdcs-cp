import { createReducer, on } from '@ngrx/store';
import { showSnackbar, hideSnackbar } from './snackbar.actions';

export type Message = {
  title: string;
  message: string;
};

export interface SnackbarState {
  message: string | Message[];
  show: boolean;
  title: string;
  typeSnackbar: string;
}

export const initialSnackbarState: SnackbarState = {
  message: '',
  show: false,
  typeSnackbar: 'success',
  title: 'Success!',
};

export const snackbarReducer = createReducer(
  initialSnackbarState,
  on(
    showSnackbar,
    (state, payload): SnackbarState => ({
      ...state,
      ...payload,
      show: true,
    })
  ),
  on(
    hideSnackbar,
    (state): SnackbarState => ({
      ...state,
      show: false,
    })
  )
);
