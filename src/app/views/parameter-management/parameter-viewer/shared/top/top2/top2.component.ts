import { Component, Input } from '@angular/core';
import { UserTableComponent } from '../../components/user-table/user-table.component';

@Component({
  selector: 'app-top2',
  standalone: true,
  imports: [UserTableComponent],
  templateUrl: './top2.component.html',
  styleUrl: './top2.component.scss',
})
export class Top2Component {
  @Input() data: any;
  @Input() items: { label: string; value: string }[] = [
    {
      label: 'Label 1',
      value: 'Value 1',
    },
    {
      label: 'Label 1',
      value: 'Value 1',
    },
    {
      label: 'Label 1',
      value: 'Value 1',
    },
    {
      label: 'Label 1',
      value: 'Value 1',
    },
    {
      label: 'Label 1',
      value: 'Value 1',
    },
    {
      label: 'Label 1',
      value: 'Value 1',
    },
    {
      label: 'Label 1',
      value: 'Value 1',
    },
    {
      label: 'Label 1',
      value: 'Value 1',
    },
    {
      label: 'Label 1',
      value: 'Value 1',
    },
    {
      label: 'Label 1',
      value: 'Value 1',
    },
  ];
}
