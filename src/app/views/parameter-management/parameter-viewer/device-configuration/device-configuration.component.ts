import { Component, Input, OnInit } from '@angular/core';
import { MatGridListModule } from '@angular/material/grid-list';
import { IParameterBfcConfig } from '@app/models/parameter-management';
import { ParameterViewerService } from '@app/services/parameter-viewer.service';

@Component({
  selector: 'app-device-configuration',
  standalone: true,
  imports: [MatGridListModule],
  templateUrl: './device-configuration.component.html',
  styleUrl: './device-configuration.component.scss',
})
export class DeviceConfigurationComponent implements OnInit {
  @Input() bfcConfig: IParameterBfcConfig[] = [];
  @Input() type: number;
  @Input() payload: any;
  bfcConfig1: IParameterBfcConfig[] = [];
  bfcConfig2: IParameterBfcConfig[] = [];

  constructor(private parameterViewerService: ParameterViewerService) {}

  ngOnInit(): void {
    switch (this.type) {
      case 2:
        {
          const mapData = this.parameterViewerService.parameterMapper(
            this.type,
            this.payload
          );
          this.bfcConfig1 = mapData.param1;
          this.bfcConfig2 = mapData.param2;
        }

        break;
      default:
        this.bfcConfig1 = this.bfcConfig.slice(0, this.bfcConfig.length / 2);
        this.bfcConfig2 = this.bfcConfig.slice(this.bfcConfig.length / 2);
        break;
    }
  }
}
