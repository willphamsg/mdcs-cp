import { Component, Input } from '@angular/core';
import { UserTableComponent } from '../../components/user-table/user-table.component';

@Component({
  selector: 'app-top1',
  standalone: true,
  imports: [UserTableComponent],
  templateUrl: './top1.component.html',
  styleUrl: './top1.component.scss',
})
export class Top1Component {
  @Input() data: any;
}
