import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonthFilterComponent } from './month-filter.component';

describe('MonthFilterComponent', () => {
  let component: MonthFilterComponent;
  let fixture: ComponentFixture<MonthFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MonthFilterComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MonthFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have a currentDate initialized', () => {
    expect(component.currentDate).toBeInstanceOf(Date);
  });

  it('should return formatted currentMonthYear string', () => {
    component.currentDate = new Date(2025, 0, 15); // Jan 2025
    expect(component.currentMonthYear).toBe('Jan 2025');
  });

  it('should decrease month on prevMonth()', () => {
    // Use a date within the 3-month-ago window so canGoPrevMonth() returns true
    const now = new Date();
    const targetMonth = now.getMonth(); // current month
    component.currentDate = new Date(now.getFullYear(), targetMonth, 15);
    component.prevMonth();
    const expectedMonth = targetMonth === 0 ? 11 : targetMonth - 1;
    expect(component.currentDate.getMonth()).toBe(expectedMonth);
  });

  it('should increase month on nextMonth()', () => {
    // Use a date at least 1 month in the past so canGoNextMonth() returns true
    const now = new Date();
    const targetMonth = now.getMonth() - 1;
    component.currentDate = new Date(now.getFullYear(), targetMonth, 15);
    component.nextMonth();
    expect(component.currentDate.getMonth()).toBe(now.getMonth());
  });

  it('should roll back year when going before January', () => {
    // Use a January date within the allowed 3-month window
    const now = new Date();
    // Set currentDate to January of this year
    component.currentDate = new Date(now.getFullYear(), 0, 15);

    // canGoPrevMonth checks if candidate >= 3 months ago
    // If January of this year is within 3 months of now, prevMonth will work
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    threeMonthsAgo.setDate(1);
    const candidateDate = new Date(now.getFullYear() - 1, 11, 1); // Dec prev year

    if (candidateDate >= threeMonthsAgo) {
      component.prevMonth();
      expect(component.currentDate.getMonth()).toBe(11); // Dec
      expect(component.currentDate.getFullYear()).toBe(now.getFullYear() - 1);
    } else {
      // If Dec of prev year is too far back, prevMonth should be blocked
      component.prevMonth();
      // currentDate should remain unchanged (January of current year)
      expect(component.currentDate.getMonth()).toBe(0);
      expect(component.currentDate.getFullYear()).toBe(now.getFullYear());
    }
  });

  it('should roll forward year when going past December', () => {
    // Use December of the previous year so nextMonth lands on Jan of current year
    const now = new Date();
    component.currentDate = new Date(now.getFullYear() - 1, 11, 15); // Dec last year
    component.nextMonth();
    expect(component.currentDate.getMonth()).toBe(0); // Jan
    expect(component.currentDate.getFullYear()).toBe(now.getFullYear());
  });
});
