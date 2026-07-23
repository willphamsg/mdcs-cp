import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

export interface IRadioList {
  id: string;
  label: string;
}

@Component({
  selector: 'app-radio',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div>
      <div class="radio-container">
        @for (parameter of parameterList; track $index) {
          <label class="custom-radio">
            <input
              [formControl]="radioControl"
              type="radio"
              [value]="parameter.id"
              (change)="onSelectionChange(parameter.id)" />
            <span class="radio-label">{{ parameter.label }}</span>
          </label>
        }
      </div>
    </div>
  `,
  styleUrl: './radio.component.scss',
})
export class RadioComponent implements OnInit {
  @Input() parameterList: IRadioList[] = []; // Array of parameters
  @Output() selectionChange = new EventEmitter<string>(); // Emit selected value

  selectedOption: string | null = null;
  radioControl = new FormControl();

  ngOnInit(): void {
    if (this.parameterList?.length > 0) {
      this.selectedOption = this.parameterList[0].id;
      this.radioControl.setValue(this.selectedOption);
      this.selectionChange.emit(this.selectedOption); // Emit the default value
    }
  }

  onSelectionChange(option: string): void {
    this.selectionChange.emit(option);
  }
}
