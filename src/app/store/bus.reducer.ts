/* eslint-disable @ngrx/on-function-explicit-return-type */
import { createReducer, on } from '@ngrx/store';
import * as busActions from '../store/bus.action';
import { IBustList } from '../models/bus-list';

export interface BusState {
  bus: IBustList[];
  error: string;
}
export const initialState: BusState = {
  bus: [],
  error: '',
};

export const busReducer = createReducer(
  initialState,

  on(busActions.addBus, (state, { busList }) => ({
    ...state,
    bus: [...state.bus, busList],
  })),

  on(busActions.deleteBus, (state, { id }) => ({
    ...state,
    bus: state.bus.filter(t => t.id !== id),
  })),
  on(busActions.clearBus, () => initialState)
);
