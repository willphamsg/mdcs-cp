import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { DepotDropdownComponent } from '../../components/depot-dropdown/depot-dropdown.component';
import {
  IRadioList,
  RadioComponent,
} from '../../components/radio/radio.component';

@Component({
  selector: 'app-top3',
  standalone: true,
  imports: [RadioComponent, DepotDropdownComponent],
  templateUrl: './top3.component.html',
  styleUrl: './top3.component.scss',
})
export class Top3Component implements OnInit {
  @Input() data: any;
  @Input() radioOptions: IRadioList[] = [
    {
      id: '1',
      label: 'Option 1',
    },
    {
      id: '2',
      label: 'Option 2',
    },
  ];
  @Output() valuesEmitter = new EventEmitter<{
    option: string;
    depot: string;
  }>();

  @Output() depotChange = new EventEmitter<string>();
  @Output() validityEmitter = new EventEmitter<boolean>();
  selectedRadio: string | null = null;
  selectedDepot: string | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    console.log(this.data);
  }

  onSelectionChange(selectedOption: string) {
    this.selectedRadio = selectedOption;
    this.emitValuesIfValid();
  }

  onDepotChange(selectedDepot: string) {
    this.selectedDepot = selectedDepot;
    this.cdr.detectChanges();
    console.log({ selectedDepot });
    this.emitValuesIfValid();
  }

  private emitValuesIfValid() {
    if (this.selectedDepot && this.selectedRadio) {
      this.validityEmitter.emit(true);
      this.valuesEmitter.emit({
        option: this.selectedRadio!,
        depot: this.selectedDepot,
      });
    }
  }
}
