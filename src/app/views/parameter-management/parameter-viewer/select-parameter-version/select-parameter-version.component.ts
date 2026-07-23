import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatRadioModule } from '@angular/material/radio';
import {
  IParameterMultipleVersion,
  IParameterViewDetails,
} from '@app/models/parameter-management';

@Component({
  selector: 'app-select-parameter-version',
  standalone: true,
  imports: [FormsModule, MatRadioModule],
  templateUrl: './select-parameter-version.component.html',
  styleUrl: './select-parameter-version.component.scss',
})
export class SelectParameterVersionComponent
  implements OnChanges
{
  @Input() parameterMultipleVersion: IParameterMultipleVersion[] = [];
  // @Input() originalParameterMultipleVersion: IParameterMultipleVersion[] = [];
  @Input() parameterVersionSelected: IParameterViewDetails;
  @Input() depotSelected: string;
  @Input() isMultipleVersion: boolean | undefined;
  @Output() versionEmitted = new EventEmitter<IParameterViewDetails>();

  parameterMultipleVersionRadio: any[] = [];

  constructor() {}


  ngOnChanges(changes: SimpleChanges): void {
    this.checkMultiVersion();
  }


  checkMultiVersion(): void {
    // this.parameterMultipleVersion = this.originalParameterMultipleVersion;
    if (!this.isMultipleVersion) {
      // this.parameterMultipleVersionRadio = this.parameterMultipleVersion.filter(version => version.depot_id === this.parameterVersionSelected.depot_id);
      this.parameterMultipleVersionRadio = this.parameterMultipleVersion.filter(
        version => version.depot_id === Number.parseInt(this.depotSelected, 10)
      );

      if (this.parameterMultipleVersionRadio.length === 0) {
        this.parameterMultipleVersionRadio = [this.parameterVersionSelected];
      }

      // Ensure the selected version is the same object reference as in the radio options
      const matchedVersion = this.parameterMultipleVersionRadio.find(
        version => version.id === this.parameterVersionSelected?.id
      );
      this.parameterVersionSelected =
        matchedVersion || this.parameterMultipleVersionRadio[0];
    } else {
      this.parameterMultipleVersionRadio = this.parameterMultipleVersion;
      // Ensure the selected version matches an object reference in the radio options
      const matchedVersion = this.parameterMultipleVersionRadio.find(
        version => version.id === this.parameterVersionSelected?.id
      );
      this.parameterVersionSelected =
        matchedVersion || this.parameterMultipleVersionRadio[0];
    }
  }

  emitSelectedVersion() {
    this.versionEmitted.emit(this.parameterVersionSelected);
  }

  replaceQuestionMark(input: string, replacements: string[]): string[] {
    return replacements.map(letter => input.replace('?.', letter));
  }
}
