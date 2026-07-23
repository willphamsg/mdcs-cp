import { Component, Input, OnInit } from '@angular/core';
import { UserTableComponent } from '../../components/user-table/user-table.component';

@Component({
  selector: 'app-top0',
  standalone: true,
  imports: [UserTableComponent],
  templateUrl: './top0.component.html',
})
export class Top0Component implements OnInit {
  @Input() data: any;

  ngOnInit(): void {
    console.log('Top0component ', this.data);
  }
}
