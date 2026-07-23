import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { IDepoList } from '@app/models/depo';
import { combineLatest, Subject, takeUntil } from 'rxjs';
import { DepoService } from '@app/services/depo.service';

@Component({
  selector: 'app-select-depot',
  standalone: true,
  imports: [FormsModule, MatSelectModule, MatOptionModule],
  templateUrl: './select-depot.component.html',
  styleUrl: './select-depot.component.scss',
})
export class SelectDepotComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();
  depots: IDepoList[] = [];

  @Input() depotSelected: string;
  @Output() depotEmitted = new EventEmitter<string>();

  constructor(private depoService: DepoService) {}

  ngOnInit(): void {
    this.subscribeToDepoChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  emitSelectedDepot() {
    this.depotEmitted.emit(this.depotSelected);
  }

  subscribeToDepoChanges(): void {
    const depotList$ = this.depoService.depoList$;
    combineLatest([depotList$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([depotList]) => {
        this.depots = depotList;
      });
  }
}
