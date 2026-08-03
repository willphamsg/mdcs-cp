import { Injectable } from '@angular/core';
import { Observable, fromEvent, merge, of } from 'rxjs';
import { map } from 'rxjs/operators';

export enum ConnectionStatusEnum {
  Online,
  Offline,
}

@Injectable({
  providedIn: 'root',
})
export class NetworkConnectionService {
  online$: Observable<boolean>;

  constructor() {
    this.online$ = merge(
      of(navigator.onLine),
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    );
  }
}
