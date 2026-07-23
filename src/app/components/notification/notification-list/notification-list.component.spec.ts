import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationListComponent } from './notification-list.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('NotificationListComponent', () => {
  let component: NotificationListComponent;
  let fixture: ComponentFixture<NotificationListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BrowserAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should have 3 header columns', () => {
    expect(component.headerData.length).toBe(3);
  });

  it('should derive tab1Columns from headerData fields', () => {
    expect(component.tab1Columns).toEqual(['id', 'expectedDateTime', 'description']);
  });

  it('should have 4 data source entries', () => {
    expect(component.dataSource.length).toBe(4);
  });

  it('should have empty notifications initially', () => {
    expect(component.notifications).toEqual([]);
  });

  it('each data source entry should have expectedDateTime and description', () => {
    for (const item of component.dataSource) {
      expect(item.expectedDateTime).toBeDefined();
      expect(item.description).toBeDefined();
    }
  });
});
