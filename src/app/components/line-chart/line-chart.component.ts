import { Component, Input, OnInit, SimpleChanges } from '@angular/core';

import { ChartConfiguration, ChartData, ChartEvent, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

export interface LineChartDataPoint {
  x: string;
  y: number;
}

export interface LineChartConfig {
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  showGrid?: boolean;
  showXGrid?: boolean;
  showYGrid?: boolean;
  verticalLabels?: boolean;
}

@Component({
  selector: 'app-line-chart',
  imports: [BaseChartDirective],
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss'],
})
export class LineChartComponent implements OnInit {
  @Input() data: LineChartDataPoint[] = [];
  @Input() config: LineChartConfig = {};
  @Input() height: number = 400;
  @Input() width: number = 800;

  public chartType: ChartType = 'line';
  public chartData: ChartConfiguration['data'] = {
    labels: [],
    datasets: [],
  };
  public chartOptions: ChartConfiguration['options'] = {};

  ngOnInit() {
    this.setupChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      const current = changes['data'].currentValue;
      const previous = changes['data'].previousValue;
      //   console.log('Previous value:', previous);
      //   console.log('Current value:', current);
      if (current?.length !== previous?.length) {
        this.setupChart();
      }
    }

    if (changes['config']) {
      const currentConfig = changes['config'].currentValue;
      const previousConfig = changes['config'].previousValue;

      if (JSON.stringify(currentConfig) !== JSON.stringify(previousConfig)) {
        this.setupChart();
      }
    }
  }

  private setupChart() {
    // Setup chart data
    this.chartData = {
      labels: this.data.map(point => point.x),
      datasets: [
        {
          data: this.data.map(point => point.y),
          label: '',
          borderColor: this.config.borderColor || '#648fff',
          backgroundColor: this.config.backgroundColor || 'transparent',
          borderWidth: this.config.borderWidth || 1,
          pointBackgroundColor: 'rgba(148,159,177,1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(148,159,177,0.8)',
          tension: 0.5,
        },
      ],
    };

    // Setup chart options
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      backgroundColor: this.config.backgroundColor || '#F3F7FF',
      elements: {
        line: {
          tension: 0.5,
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: this.config.verticalLabels ? 90 : 0,
            minRotation: this.config.verticalLabels ? 90 : 0,
          },
          grid: {
            display:
              this.config.showXGrid !== undefined
                ? this.config.showXGrid
                : false,
          },
        },
        y: {
          position: 'left',
          // Bus counts are non-negative integers: clamp at 0 and only step
          // by whole numbers so the axis never shows negatives or fractions.
          beginAtZero: true,
          min: 0,
          ticks: {
            precision: 0,
          },
          border: {
            display: true,
          },
          grid: {
            display:
              this.config.showYGrid !== undefined
                ? this.config.showYGrid
                : true,
          },
        },
      },
      plugins: {
        legend: { display: false },
        title: this.config.title
          ? {
              display: false,
              text: this.config.title,
              // align: 'start',
              // color: '#000',
              // font: {
              //   size: 16,
              // },
              // padding: {
              //   top: 10,
              //   bottom: 0,
              // },
            }
          : { display: false },
        subtitle: this.config.subtitle
          ? {
              display: false,
              text: this.config.subtitle,
              // align: 'end',
              // color: '#000',
              // font: { size: 16 },
              // padding: {
              //   top: -15,
              //   bottom: 30,
              // },
            }
          : { display: false },
      },
    };
  }

  // Chart event handlers
  public chartClicked({
    event,
    active,
  }: {
    event?: ChartEvent;
    active?: object[];
  }): void {
    // console.log('Chart clicked:', event, active);
  }

  public chartHovered({
    event,
    active,
  }: {
    event?: ChartEvent;
    active?: object[];
  }): void {
    // console.log('Chart hovered:', event, active);
  }
}
