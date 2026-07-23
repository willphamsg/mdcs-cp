import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';
import { IMessage } from '@app/models/message';
import { NotificationComponent } from './notification.component';

describe('NotificationComponent', () => {
  let component: NotificationComponent;
  let fixture: ComponentFixture<NotificationComponent>;

  const mockNotifications: IMessage[] = [
    { title: 'Update', message: 'New update available.', dateTime: '2024-07-01T09:03:00', read: false },
    { title: 'Alert', message: 'Security patch.', dateTime: '2024-07-02T10:00:00', read: false },
    { title: 'Notice', message: 'Maintenance soon.', dateTime: '2024-07-03T12:30:00', read: true },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with 3 default notifications', () => {
    expect(component.notifications).toHaveSize(3);
  });

  it('should count unread items correctly', () => {
    component.notifications = mockNotifications.map(n => ({ ...n }));
    expect(component.unreadItems).toBe(2);
  });

  it('should return 0 unread when all are read', () => {
    component.notifications = mockNotifications.map(n => ({ ...n, read: true }));
    expect(component.unreadItems).toBe(0);
  });

  it('should mark all notifications as read', () => {
    component.notifications = mockNotifications.map(n => ({ ...n }));
    component.markAllAsRead();

    component.notifications.forEach(notification => {
      expect(notification.read).toBeTrue();
    });
    expect(component.unreadItems).toBe(0);
  });
});
