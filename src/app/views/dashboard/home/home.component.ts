import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, Subscription } from 'rxjs';
import { IConnectedBusParams } from '@models/bus-operation';

import { ChartConfiguration, ChartType } from 'chart.js';

import { IDepoList } from '@models/depo';
import { DepoService } from '@services/depo.service';
import { DashboardService } from '@services/dashboard.service';
import { AuthService } from '@app/services/auth.service';

import { WebSocketService, WS_TOPICS } from '@app/services/web-socket.service';

import {
  LineChartComponent,
  LineChartConfig,
} from '@components/line-chart/line-chart.component';

interface IBusDetails {
  time: string;
  num_of_buses: number;
}
interface IConnectedBus {
  depot_name: string;
  depot_code: string;
  depot_id?: string;
  total: number;
  bus_details: IBusDetails[];
}

interface IDAGWStatus {
  id: number;
  depot_code: string;
  depot_name: string;
  status: 'Degraded' | 'Down' | 'Running';
}

interface IConnectedBusCount {
  depot_id: number;
  captured_at: string;
  nos_of_buses: number;
}

const POLLING_INTERVAL = 10000;
@Component({
  selector: 'app-mdcs-home',
  imports: [
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatCheckboxModule,
    MatSortModule,
    MatButtonModule,
    CommonModule,
    RouterModule,
    FormsModule,
    MatTabsModule,
    LineChartComponent,
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  depots: IDepoList[] = [];
  depotSelected: string = '';
  hourSelected: number = 1;
  depotStatues: IDAGWStatus[] = [];
  lastUpdatedTime: number = Date.now();

  tasks: Record<string, { desc: string; link: string }> = {
    bus_transfer_count: {
      desc: 'Bus Transfer',
      link: '/mdcs/bus-transfer',
    },
    new_parameter_approval_count: {
      desc: 'New Parameter Approval',
      link: '/mdcs/parameter-trial/approval',
    },
    parameter_mode_count: {
      desc: 'Parameter Mode',
      link: '/mdcs/parameter-trial/parameter-mode',
    },
    parameter_end_trial_count: {
      desc: 'Parameter End Trial',
      link: '/mdcs/parameter-trial/end-trial',
    },
  };

  taskList: { desc: string; tasks: number; link: string }[] = [];

  busesRendered: IConnectedBus[] = [];

  public lineChartType: ChartType = 'line';
  public lineChartData: ChartConfiguration['data'] = {
    labels: this.busesRendered[0]?.bus_details?.map((bus: any) => bus.time),
    datasets: [
      {
        // barThickness: 36, //bar width
        data: this.busesRendered[0]?.bus_details?.map(
          (bus: any) => bus.num_of_buses
        ),
        label: '',
        // backgroundColor: 'rgba(0,0,0)',
        borderColor: '#648fff',
        borderWidth: 1,
        pointBackgroundColor: 'rgba(148,159,177,1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(148,159,177,0.8)',
        // fill: 'origin',
      },
    ],
  };
  public lineChartOptions: ChartConfiguration['options'] = {
    backgroundColor: '#F3F7FF',
    elements: {
      line: {
        tension: 0.5,
      },
    },
    scales: {
      // We use this empty structure as a placeholder for dynamic theming.
      x: {
        ticks: {
          maxRotation: 90,
          minRotation: 90,
        },
        grid: {
          display: false,
        },
      },
      y: {
        position: 'left',
        border: {
          display: true,
        },
        // ticks: {
        //   padding: 1,
        // },
        // afterFit(scale) {
        //   scale.width = 20;
        // },
      },
    },

    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Depot ABC',
        align: 'start',
        color: '#000',
        font: {
          size: 16,
        },
        padding: {
          top: 10,
          bottom: 0,
        },
      },
      subtitle: {
        display: true,
        text: 'Total Bus: 20',
        align: 'end',
        color: '#000',
        font: {
          size: 16,
          weight: 'bold',
        },
        padding: {
          top: -15,
          bottom: 30,
        },
      },
    },
  };

  private refreshSubscription?: Subscription;
  private dagwStatusSubscription?: Subscription;
  private parameterTrialCountSubscription?: Subscription;
  private busTransferCountSubscription?: Subscription;
  private readonly taskCountPayload: Record<string, number> = {};

  constructor(
    private readonly depoService: DepoService,
    private readonly dashboardService: DashboardService,
    private readonly router: Router,
    private readonly webSocketService: WebSocketService,
    public readonly authService: AuthService,
  ) {}

  ngOnInit() {
    this.depoService?.depoList$
      ?.pipe(takeUntil(this.destroy$))
      .subscribe((value: IDepoList[]) => {
        this.depots = value;
      });

    console.log('🚀 this.depots:', );

    this.startPolling();
    this.startDashboardRefresh();
  }

  startPolling() {
    this.generateBusesRendered();

    this.refreshSubscription?.unsubscribe();

    this.refreshSubscription = this.webSocketService
      .refreshTrigger(WS_TOPICS.busOperationStatus, POLLING_INTERVAL)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.generateBusesRendered();
      });
  }

  // private fetchStatusAndTaskList() {
  //   this.dashboardService
  //     .getDagwStatus()
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe(res => {
  //       if (res.status === 200) {
  //         this.depotStatues = res.payload.status_list;
  //       }
  //     });

  //   const taskList$ = this.dashboardService.getTaskList();
  //   const busTransferCount$ = this.dashboardService.getBusTransferCount();

  //   combineLatest([taskList$, busTransferCount$])
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe(([taskListRes, busTransferCountRes]) => {
  //       const payload: Record<string, number> = {};

  //       if (taskListRes.status === 200) {
  //         Object.assign(payload, taskListRes.payload);
  //       }

  //       if (busTransferCountRes.status === 200) {
  //         Object.assign(payload, busTransferCountRes.payload);
  //       }

  //       this.taskList = [];
  //       Object.keys(this.tasks).forEach(key => {
  //         if (payload[key] !== undefined) {
  //           this.taskList.push({
  //             desc: this.tasks[key].desc,
  //             tasks: payload[key],
  //             link: this.tasks[key].link,
  //           });
  //         }
  //       });
  //     });
  // }

  private startDashboardRefresh() {
    this.dagwStatusSubscription?.unsubscribe();
    this.parameterTrialCountSubscription?.unsubscribe();
    this.busTransferCountSubscription?.unsubscribe();

    this.dagwStatusSubscription = this.webSocketService
      .refreshTrigger(WS_TOPICS.busOperationStatus, POLLING_INTERVAL, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchDagwStatus();
      });

    this.parameterTrialCountSubscription = this.webSocketService
      .refreshTrigger(WS_TOPICS.parameterTrial, POLLING_INTERVAL, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchParameterTrialStatusCount();
      });

    this.busTransferCountSubscription = this.webSocketService
      .refreshTrigger(WS_TOPICS.busTransfer, POLLING_INTERVAL, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.fetchBusTransferCount();
      });
  }

  private fetchDagwStatus() {
    this.dashboardService
      .getDagwStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res.status === 200) {
          this.depotStatues = res.payload.status_list;
        }
      });
  }

  private fetchParameterTrialStatusCount() {
    this.dashboardService
      .getTaskList()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res.status === 200) {
          Object.assign(this.taskCountPayload, res.payload);
          this.renderTaskList();
        }
      });
  }

  private fetchBusTransferCount() {
    this.dashboardService
      .getBusTransferCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res.status === 200) {
          Object.assign(this.taskCountPayload, res.payload);
          this.renderTaskList();
        }
      });
  }

  private renderTaskList() {
    this.taskList = [];

    const isOpe = this.authService.getUserRoles().includes('ope');

    Object.keys(this.tasks).forEach(key => {
      if (isOpe && key !== 'bus_transfer_count') {
        return;
      }
      if (this.taskCountPayload[key] !== undefined) {
        this.taskList.push({
          desc: this.tasks[key].desc,
          tasks: this.taskCountPayload[key],
          link: this.tasks[key].link,
        });
      }
    });
  }

  private generateBusesRendered() {
    const params: IConnectedBusParams = {
      depot_ids: this.depotSelected ? [Number.parseInt(this.depotSelected, 10)] : [],
      hours: this.hourSelected,
    };
    this.dashboardService
      .search(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res.status === 200) {
          this.lastUpdatedTime = Date.now();
          this.transformBusData(res.payload.depot_bus_count);
        }
      });
  }

  private transformBusData(depotBusCount: IConnectedBusCount[]) {
    const mappingByDepotId = depotBusCount?.reduce(
      (acc: any, curr: IConnectedBusCount) => {
        if (!acc[curr.depot_id]) {
          const depot = this.depots.find(
            d => d.depot_id.toString() === curr.depot_id.toString()
          );
          if (depot) {
            acc[curr.depot_id] = {
              depot_name: depot?.depot_name,
              depot_code: depot?.depot_code,
              depot_id: curr.depot_id,
              total: 0,
              bus_details: [],
            };
          }
        }
        if (acc[curr.depot_id]) {
          acc[curr.depot_id].total += curr.nos_of_buses;
          acc[curr.depot_id].bus_details.push({
            time: curr.captured_at.split(' ')[1], // Extract time from timestamp
            num_of_buses: curr.nos_of_buses,
          });
        }

        return acc;
      },
      {}
    );

    // sort bus_details by time ascending for each depot
    for (const depotId in mappingByDepotId) {
      mappingByDepotId[depotId].bus_details.sort(
        (a: IBusDetails, b: IBusDetails) => a.time.localeCompare(b.time)
      );
    }

    this.busesRendered = Object.values(mappingByDepotId);
    // console.log('🚀 mapping:', this.busesRendered);
  }

  setHour(hour: number) {
    this.hourSelected = hour;
    this.refreshSubscription?.unsubscribe();
    this.startPolling();
  }

  transformChartData(connectedBus: IConnectedBus) {
    return connectedBus.bus_details.map((bus: IBusDetails) => ({
      x: bus.time,
      y: bus.num_of_buses,
    }));
  }

  chartConfig(connectedBus: IConnectedBus): LineChartConfig {
    return {
      title: connectedBus.depot_name,
      subtitle: `Bus in Depot: ${connectedBus.total}`,
      borderWidth: 1,
      borderColor: '#648fff',
      showXGrid: false,
      showYGrid: true,
      verticalLabels: true,
      backgroundColor: '#F3F7FF',
    };
  }

  handleSelectDepot(event: any) {
    // if (event.value) {
    //   this.router.navigate(['/dacs/dashboard', event.value]);
    // }

    this.depotSelected = event.value;
    this.refreshSubscription?.unsubscribe();
    this.startPolling();
  }

  ngOnDestroy() {
    this.refreshSubscription?.unsubscribe();
    this.dagwStatusSubscription?.unsubscribe();
    this.parameterTrialCountSubscription?.unsubscribe();
    this.busTransferCountSubscription?.unsubscribe();

    this.destroy$.next();
    this.destroy$.complete();
  }
}
