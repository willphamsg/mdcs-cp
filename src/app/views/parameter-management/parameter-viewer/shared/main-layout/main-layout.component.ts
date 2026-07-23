import {
  ChangeDetectorRef,
  Component,
  ComponentRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { ILayoutConfig } from '@app/models/layout-config';
import { LayoutConfigService } from '@app/services/layout-config.service';
import { combineLatest, Subject, take, takeUntil } from 'rxjs';
import { componentRegistry } from '../../core/component-registry';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private destroyData$ = new Subject<void>();

  private topComponentRef: ComponentRef<any> | null = null;
  private otherComponentRefs: ComponentRef<any>[] = [];
  private previousLayoutConfig: ILayoutConfig | null = null;

  @ViewChild('topContainer', { read: ViewContainerRef })
  topContainer!: ViewContainerRef;
  @ViewChild('userTableContainer', { read: ViewContainerRef })
  userTableContainer!: ViewContainerRef;
  @ViewChild('middleContainer', { read: ViewContainerRef })
  middleContainer!: ViewContainerRef;
  @ViewChild('bottomContainer', { read: ViewContainerRef })
  bottomContainer!: ViewContainerRef;

  layoutConfig: ILayoutConfig | null = null;
  selectedDepot: string | null = null;

  topComponentValid: boolean = false;

  constructor(
    private readonly layoutConfigService: LayoutConfigService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const layoutConfig$ = this.layoutConfigService.layoutConfig$;
    const topFieldValues$ = this.layoutConfigService.topFieldValues$;

    combineLatest([layoutConfig$, topFieldValues$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([config, fieldValues]) => {
        if (config?.callApiOnPageSelect) {
          this.layoutConfigService.triggerApi(fieldValues);
        }

        if (this.previousLayoutConfig !== config) {
          this.topComponentValid = false;
          this.destroyTopComponent();
        }

        this.resetDataSubscriptions();
        this.destroyOtherComponents();
        this.layoutConfig = config;
        this.previousLayoutConfig = config;
        this.cdr.detectChanges();
        this.renderComponents(config);
      });
  }

  ngOnDestroy(): void {
    this.destroyOtherComponents();
    this.destroyTopComponent();
    this.layoutConfigService.reset();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private renderComponents(config: ILayoutConfig | null): void {
    if (!config) return;

    // Always render the top component
    this.renderTopComponent(config);

    if (!config.requiresValidation || this.topComponentValid) {
      this.renderUserTableComponent(config);
      this.renderMiddleComponent(config);
      this.renderBottomComponent(config);
    }
  }

  private renderTopComponent(config: ILayoutConfig): void {
    if (!config.topComponent) return;

    if (
      !this.topComponentRef ||
      this.previousLayoutConfig?.topComponent !== config.topComponent
    ) {
      this.destroyTopComponent();

      const topComponent = componentRegistry[config.topComponent];
      this.topComponentRef = this.topContainer.createComponent(topComponent);

      this.layoutConfigService.topData$
        .pipe(take(1), takeUntil(this.destroyData$))
        .subscribe(data => {
          if (this.topComponentRef) {
            this.topComponentRef.instance.data = data;
            this.topComponentRef.changeDetectorRef.detectChanges();
          }
        });

      this.bindOutput(this.topComponentRef, {
        valuesEmitter: this.onValuesChange,
        validityEmitter: (isValid: boolean) =>
          (this.topComponentValid = isValid),
      });
    }
  }

  private renderUserTableComponent(config: ILayoutConfig): void {
    if (!config.userTableComponent) return;

    const userTableComponent = componentRegistry[config.userTableComponent];
    const userTableRef = this.userTableContainer.createComponent(
      userTableComponent
    ) as ComponentRef<any>;
    this.otherComponentRefs.push(userTableRef);

    this.layoutConfigService.userTable$
      .pipe(takeUntil(this.destroyData$))
      .subscribe(data => {
        if (userTableRef.instance) {
          userTableRef.instance.data = data;
          userTableRef.changeDetectorRef.detectChanges();
        }
      });
  }

  private renderMiddleComponent(config: ILayoutConfig): void {
    if (!config.middleComponent) return;

    const middleComponent = componentRegistry[config.middleComponent];
    const middleRef = this.middleContainer.createComponent(
      middleComponent
    ) as ComponentRef<any>;
    this.otherComponentRefs.push(middleRef);

    this.bindOutput(middleRef, {
      tabChange: this.onTabChange,
    });

    this.layoutConfigService.middleData$
      .pipe(takeUntil(this.destroyData$))
      .subscribe(data => {
        if (middleRef.instance) {
          middleRef.instance.data = data;
          middleRef.changeDetectorRef.detectChanges();
        }
      });
  }

  private renderBottomComponent(config: ILayoutConfig): void {
    if (!config.bottomComponent) return;
    let bottomComponent: any;

    // Still not final, needs to finalize the design
    // Refactor for permanent solution
    if (typeof config.bottomComponent === 'string') {
      bottomComponent = componentRegistry[config.bottomComponent];
    } else if (typeof config.bottomComponent === 'object') {
      console.error(
        'Unexpected structure: renderBottomComponent expects resolved component string, not a mapping object.'
      );
      return;
    }
    this.destroyBottomComponent();

    const bottomRef = this.bottomContainer.createComponent(
      bottomComponent
    ) as ComponentRef<any>;
    this.otherComponentRefs.push(bottomRef);

    this.layoutConfigService.bottomData$
      .pipe(takeUntil(this.destroyData$))
      .subscribe(data => {
        if (bottomRef.instance) {
          bottomRef.instance.data = data;
          bottomRef.changeDetectorRef.detectChanges();
        }
      });
  }

  private bindOutput(
    compRef: ComponentRef<any>,
    outputHandlers: { [key: string]: (...args: any[]) => void }
  ): void {
    Object.entries(outputHandlers).forEach(([outputName, handler]) => {
      const output = compRef.instance[outputName];
      if (output) {
        output.subscribe(handler.bind(this));
      }
    });
  }

  onValuesChange(values: { [key: string]: string }): void {
    console.log('Values: ', values);
    this.selectedDepot = values['depot'];
    this.layoutConfigService.updateFieldValues({ depot: values['depot'] });

    this.resetDataSubscriptions();
    this.destroyOtherComponents();
    this.renderComponents(this.layoutConfig);
  }

  onTabChange(tabIndex: number): void {
    if (!this.layoutConfig) return;

    let newBottomComponent: string | null = null;

    if (
      this.layoutConfig.bottomComponent &&
      typeof this.layoutConfig.bottomComponent === 'object'
    ) {
      newBottomComponent = this.layoutConfig.bottomComponent[tabIndex] || null;
    } else {
      newBottomComponent = this.layoutConfig.bottomComponent;
    }

    if (newBottomComponent) {
      const updatedConfig: ILayoutConfig = {
        ...this.layoutConfig,
        bottomComponent: newBottomComponent,
      };

      this.destroyBottomComponent();
      this.renderBottomComponent(updatedConfig);
    } else {
      this.destroyBottomComponent();
    }
  }

  private destroyOtherComponents(): void {
    [
      this.userTableContainer,
      this.middleContainer,
      this.bottomContainer,
    ].forEach(container => container?.clear());

    this.otherComponentRefs.forEach(compRef => compRef.destroy());
    this.otherComponentRefs = [];
  }

  private destroyTopComponent(): void {
    if (this.topComponentRef) {
      this.topComponentRef.destroy();
      this.topComponentRef = null;
      this.topContainer.clear();
    }
  }

  private destroyBottomComponent(): void {
    if (this.bottomContainer) {
      this.bottomContainer.clear();
    }
    this.otherComponentRefs = this.otherComponentRefs.filter(
      ref =>
        ref.location.nativeElement !==
        this.bottomContainer.element.nativeElement
    );
  }

  private resetDataSubscriptions(): void {
    this.destroyData$.next();
    this.destroyData$.complete();
    this.destroyData$ = new Subject<void>();
  }
}
