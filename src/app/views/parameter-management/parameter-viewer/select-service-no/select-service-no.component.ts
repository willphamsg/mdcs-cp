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
  selector: 'app-select-service-no',
  standalone: true,
  imports: [FormsModule, MatSelectModule, MatOptionModule],
  templateUrl: './select-service-no.component.html',
  styleUrl: './select-service-no.component.scss',
})
export class SelectServiceNoComponent implements OnDestroy {
  destroy$ = new Subject<void>();

  @Input() serviceNoSelected: number | null = null;
  @Input() serviceNoList: number[];
  @Output() serviceNoEmit = new EventEmitter<number | null>();

  constructor() {}


  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  emitSelectedServiceNo() {
    this.serviceNoEmit.emit(this.serviceNoSelected);
  }
}
