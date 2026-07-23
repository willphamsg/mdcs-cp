import { Component, OnInit, output } from '@angular/core';
import { DatePipe } from '@angular/common';

export interface MonthRange {
  effective_date_from: string;
  effective_date_till: string;
}

@Component({
    selector: 'app-month-filter',
    imports: [],
    templateUrl: './month-filter.component.html',
    styleUrl: './month-filter.component.scss',
    providers: [DatePipe],
})
export class MonthFilterComponent implements OnInit {
  currentDate: Date = new Date();
  monthChange = output<MonthRange>();

  private readonly datePipe = new DatePipe('en-US');
  private readonly dateFormat = 'yyyy-MM-dd HH:mm:ss';

  get currentMonthYear(): string {
    return this.currentDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }

  ngOnInit(): void {
    this.emitMonthRange();
  }

  prevMonth(): void {
    if (!this.canGoPrevMonth()) {
      return;
    }
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );
    this.emitMonthRange();
  }

  canGoPrevMonth(): boolean {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    threeMonthsAgo.setDate(1);

    const candidateDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );

    return candidateDate >= threeMonthsAgo;
  }

  nextMonth(): void {
    if (!this.canGoNextMonth()) {
      return;
    }
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      1
    );
    this.emitMonthRange();
  }

  canGoNextMonth(): boolean {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const candidateDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      1
    );

    return candidateDate.getFullYear() < currentYear ||
           (candidateDate.getFullYear() === currentYear && candidateDate.getMonth() <= currentMonth);
  }

  private emitMonthRange(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0, 23, 59, 59);

    this.monthChange.emit({
      effective_date_from: this.datePipe.transform(firstDay, this.dateFormat) || '',
      effective_date_till: this.datePipe.transform(lastDay, this.dateFormat) || '',
    });
  }
}
