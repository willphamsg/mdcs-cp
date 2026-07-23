// src/app/state/snackbar/snackbar.actions.ts

import { createAction, props } from '@ngrx/store';
import { Message } from './snackbar.reducer';

export const showSnackbar = createAction(
  '[Snackbar] Show Snackbar',
  props<{
    message: string | Message[];
    duration?: number;
    title?: string;
    typeSnackbar?: string;
  }>()
);

export const hideSnackbar = createAction('[Snackbar] Hide Snackbar');
