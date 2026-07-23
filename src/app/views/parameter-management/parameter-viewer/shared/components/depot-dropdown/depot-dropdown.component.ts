import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { IDepoList } from '@app/models/depo';
import { DepoService } from '@app/services/depo.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-depot-dropdown',
  standalone: true,
  imports: [MatInputModule, MatSelectModule, CommonModule, ReactiveFormsModule],
  templateUrl: './depot-dropdown.component.html',
  styleUrl: './depot-dropdown.component.scss',
})
export class DepotDropdownComponent implements OnInit, AfterViewInit {
  @Output() depotChange = new EventEmitter<string>();
  @Input() dropdownLabel: string;
  @Input() depotVaue: string;
  depotControl = new FormControl();

  depots$: Observable<IDepoList[]>;

  constructor(
    private depotService: DepoService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.depots$ = this.depotService.depoList$;

    this.depotControl.valueChanges.subscribe(selectedDepot => {
      this.depotChange.emit(selectedDepot);
    });
  }

  ngAfterViewInit(): void {
    this.depotControl.setValue(this.depotVaue);
    this.cdr.detectChanges();
    console.log({ DEPOT: this.depotVaue });
  }
}
