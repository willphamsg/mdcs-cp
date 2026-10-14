import { Component, Input } from '@angular/core';
import { UserTableComponent } from '../../components/user-table/user-table.component';

@Component({
  selector: 'app-top0',
  standalone: true,
  imports: [UserTableComponent],
  templateUrl: './top0.component.html',
})
export class Top0Component {
  @Input() data: any;
}
