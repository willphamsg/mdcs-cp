import { Action, ActionReducer, createSelector } from '@ngrx/store';
import { BusState, busReducer } from './bus.reducer';
import { SnackbarState, snackbarReducer } from './snackbar/snackbar.reducer';

export interface AppState {
  bus: BusState;
}

export interface AppStore {
  bus: ActionReducer<BusState, Action>;
  snackbar: ActionReducer<SnackbarState, Action>;
}

export const appStore: AppStore = {
  bus: busReducer,
  snackbar: snackbarReducer,
};

export const selectBus = (state: AppState) => state.bus;

export const selectBusId = createSelector(selectBus, state => {
  return state.bus.length;
});
