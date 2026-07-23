import { createAction, props } from '@ngrx/store';
import { IBustList } from '../models/bus-list';

export const addBus = createAction(
  '[Bus] Add Bus',
  props<{ busList: IBustList }>()
);

export const deleteBus = createAction(
  '[Bus] Delete Bus',
  props<{ id: number }>()
);

export const clearBus = createAction('[Bus] Clear Bus');
