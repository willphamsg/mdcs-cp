import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import {
  LineChartComponent,
  LineChartDataPoint,
} from './line-chart.component';

describe('LineChartComponent', () => {
  let component: LineChartComponent;
  let fixture: ComponentFixture<LineChartComponent>;

  const samplePoints: LineChartDataPoint[] = [
    { x: '2025-01-01', y: 5 },
    { x: '2025-01-02', y: 10 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LineChartComponent],
      providers: [provideCharts(withDefaultRegisterables())],
    }).compileComponents();

    fixture = TestBed.createComponent(LineChartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call setupChart and populate chartData from the data input', () => {
      component.data = samplePoints;
      component.ngOnInit();

      expect(component.chartData.labels).toEqual(['2025-01-01', '2025-01-02']);
      expect(component.chartData.datasets[0].data).toEqual([5, 10]);
    });

    it('should default to empty labels/data when no data input is provided', () => {
      component.data = [];
      component.ngOnInit();

      expect(component.chartData.labels).toEqual([]);
      expect(component.chartData.datasets[0].data).toEqual([]);
    });
  });

  describe('setupChart via config', () => {
    it('should use provided config borderColor, backgroundColor and borderWidth', () => {
      component.config = {
        borderColor: '#123456',
        backgroundColor: '#abcdef',
        borderWidth: 3,
      };
      component.data = samplePoints;
      component.ngOnInit();

      const dataset: any = component.chartData.datasets[0];
      expect(dataset.borderColor).toBe('#123456');
      expect(dataset.backgroundColor).toBe('#abcdef');
      expect(dataset.borderWidth).toBe(3);
    });

    it('should fall back to default borderColor, backgroundColor and borderWidth when config is empty', () => {
      component.config = {};
      component.data = samplePoints;
      component.ngOnInit();

      const dataset: any = component.chartData.datasets[0];
      expect(dataset.borderColor).toBe('#648fff');
      expect(dataset.backgroundColor).toBe('transparent');
      expect(dataset.borderWidth).toBe(1);
    });

    it('should set backgroundColor plugin option from config when provided', () => {
      component.config = { backgroundColor: '#111111' };
      component.data = samplePoints;
      component.ngOnInit();

      expect(component.chartOptions?.backgroundColor).toBe('#111111');
    });

    it('should default chartOptions.backgroundColor when config has none', () => {
      component.config = {};
      component.data = samplePoints;
      component.ngOnInit();

      expect(component.chartOptions?.backgroundColor).toBe('#F3F7FF');
    });

    it('should set x-axis maxRotation/minRotation to 90 when verticalLabels is true', () => {
      component.config = { verticalLabels: true };
      component.data = samplePoints;
      component.ngOnInit();

      const xScale: any = component.chartOptions?.scales?.['x'];
      expect(xScale.ticks.maxRotation).toBe(90);
      expect(xScale.ticks.minRotation).toBe(90);
    });

    it('should set x-axis maxRotation/minRotation to 0 when verticalLabels is false/undefined', () => {
      component.config = {};
      component.data = samplePoints;
      component.ngOnInit();

      const xScale: any = component.chartOptions?.scales?.['x'];
      expect(xScale.ticks.maxRotation).toBe(0);
      expect(xScale.ticks.minRotation).toBe(0);
    });

    it('should show x grid when showXGrid is true', () => {
      component.config = { showXGrid: true };
      component.data = samplePoints;
      component.ngOnInit();

      const xScale: any = component.chartOptions?.scales?.['x'];
      expect(xScale.grid.display).toBeTrue();
    });

    it('should hide x grid by default when showXGrid is not provided', () => {
      component.config = {};
      component.data = samplePoints;
      component.ngOnInit();

      const xScale: any = component.chartOptions?.scales?.['x'];
      expect(xScale.grid.display).toBeFalse();
    });

    it('should hide y grid when showYGrid is false', () => {
      component.config = { showYGrid: false };
      component.data = samplePoints;
      component.ngOnInit();

      const yScale: any = component.chartOptions?.scales?.['y'];
      expect(yScale.grid.display).toBeFalse();
    });

    it('should show y grid by default when showYGrid is not provided', () => {
      component.config = {};
      component.data = samplePoints;
      component.ngOnInit();

      const yScale: any = component.chartOptions?.scales?.['y'];
      expect(yScale.grid.display).toBeTrue();
    });

    it('should build a title plugin config when config.title is provided', () => {
      component.config = { title: 'My Title' };
      component.data = samplePoints;
      component.ngOnInit();

      expect(component.chartOptions?.plugins?.title).toEqual(
        jasmine.objectContaining({ display: false, text: 'My Title' })
      );
    });

    it('should set title plugin display false with no text when config.title is absent', () => {
      component.config = {};
      component.data = samplePoints;
      component.ngOnInit();

      expect(component.chartOptions?.plugins?.title).toEqual({
        display: false,
      });
    });

    it('should build a subtitle plugin config when config.subtitle is provided', () => {
      component.config = { subtitle: 'My Subtitle' };
      component.data = samplePoints;
      component.ngOnInit();

      expect(component.chartOptions?.plugins?.subtitle).toEqual(
        jasmine.objectContaining({ display: false, text: 'My Subtitle' })
      );
    });

    it('should set subtitle plugin display false with no text when config.subtitle is absent', () => {
      component.config = {};
      component.data = samplePoints;
      component.ngOnInit();

      expect(component.chartOptions?.plugins?.subtitle).toEqual({
        display: false,
      });
    });
  });

  describe('ngOnChanges', () => {
    beforeEach(() => {
      component.data = samplePoints;
      component.config = {};
      component.ngOnInit();
    });

    it('should call setupChart when data length changes', () => {
      spyOn<any>(component, 'setupChart').and.callThrough();
      const newData = [...samplePoints, { x: '2025-01-03', y: 15 }];
      component.data = newData;

      component.ngOnChanges({
        data: new SimpleChange(samplePoints, newData, false),
      });

      expect(component['setupChart']).toHaveBeenCalled();
    });

    it('should not call setupChart when data reference changes but length stays the same', () => {
      spyOn<any>(component, 'setupChart').and.callThrough();
      const sameLengthData = [...samplePoints];
      component.data = sameLengthData;

      component.ngOnChanges({
        data: new SimpleChange(samplePoints, sameLengthData, false),
      });

      expect(component['setupChart']).not.toHaveBeenCalled();
    });

    it('should not throw when data change previousValue is undefined (first binding)', () => {
      spyOn<any>(component, 'setupChart').and.callThrough();
      component.data = samplePoints;

      expect(() =>
        component.ngOnChanges({
          data: new SimpleChange(undefined, samplePoints, true),
        })
      ).not.toThrow();
      expect(component['setupChart']).toHaveBeenCalled();
    });

    it('should call setupChart when config object content changes', () => {
      spyOn<any>(component, 'setupChart').and.callThrough();
      const newConfig = { title: 'Changed' };
      component.config = newConfig;

      component.ngOnChanges({
        config: new SimpleChange({} as any, newConfig, false),
      });

      expect(component['setupChart']).toHaveBeenCalled();
    });

    it('should not call setupChart when config content is unchanged (deep equal)', () => {
      spyOn<any>(component, 'setupChart').and.callThrough();
      const previousConfig = { title: 'Same' };
      const currentConfig = { title: 'Same' };
      component.config = currentConfig;

      component.ngOnChanges({
        config: new SimpleChange(previousConfig, currentConfig, false),
      });

      expect(component['setupChart']).not.toHaveBeenCalled();
    });

    it('should do nothing when ngOnChanges receives changes with neither data nor config', () => {
      spyOn<any>(component, 'setupChart').and.callThrough();

      component.ngOnChanges({});

      expect(component['setupChart']).not.toHaveBeenCalled();
    });
  });

  describe('chart event handlers', () => {
    it('should not throw when chartClicked is invoked', () => {
      expect(() =>
        component.chartClicked({ event: undefined, active: [] })
      ).not.toThrow();
    });

    it('should not throw when chartHovered is invoked', () => {
      expect(() =>
        component.chartHovered({ event: undefined, active: [] })
      ).not.toThrow();
    });
  });
});
