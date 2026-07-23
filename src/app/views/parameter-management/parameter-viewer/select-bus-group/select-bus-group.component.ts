import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-select-bus-group',
  standalone: true,
  imports: [FormsModule, MatSelectModule, MatOptionModule],
  templateUrl: './select-bus-group.component.html',
  styleUrl: './select-bus-group.component.scss',
})
export class SelectBusGroupComponent implements OnDestroy {
  destroy$ = new Subject<void>();

  @Input() busGroupNoSelected: number | null = null;
  @Input() busGroupNoList: number[];
  @Output() busGroupNoEmit = new EventEmitter<number | null>();

  constructor() {}


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  emitSelectedBusGroup() {
    this.busGroupNoEmit.emit(this.busGroupNoSelected);
  }
}
