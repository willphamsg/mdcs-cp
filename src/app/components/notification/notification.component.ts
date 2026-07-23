import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { IMessage } from '@app/models/message';

@Component({
    selector: 'app-notification',
    imports: [
        MatDivider,
        MatIcon,
        CommonModule,
        RouterModule,
        MatMenuModule,
        MatBadgeModule,
        MatButtonModule,
    ],
    templateUrl: './notification.component.html',
    styleUrl: './notification.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationComponent {
  // Static placeholder notifications until a notification service/API exists.
  notifications: IMessage[] = new Array(3)
    .fill(null)
    .map(() => ({
      title: 'System Update',
      message:
        'A new update is available for your application. Click here to install the update now.',
      dateTime: '2024-07-01T09:03:00',
      read: false,
    }));

  get unreadItems(): number {
    return this.notifications.filter(notif => !notif.read).length;
  }

  // Marks all notifications as read locally; wire to an update API once available.
  markAllAsRead(): void {
    this.notifications.forEach(notification => (notification.read = true));
  }
}
