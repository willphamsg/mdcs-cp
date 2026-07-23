import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { LayoutConfigService } from '@app/services/layout-config.service';

@Component({
  selector: 'app-middle2',
  standalone: true,
  imports: [CommonModule, MatTabsModule],
  templateUrl: './middle2.component.html',
  styleUrl: './middle2.component.scss',
})
export class Middle2Component implements OnInit {
  @Output() tabChange = new EventEmitter<string>();
  @Input() items: { label: string; id: string }[] = [
    { label: 'Label 1', id: 'tab1' },
    { label: 'Label 2', id: 'tab2' },
    { label: 'Label 3', id: 'tab3' },
    { label: 'Label 4', id: 'tab4' },
    { label: 'Label 5', id: 'tab5' },
    { label: 'Label 6', id: 'tab6' },
  ];
  activeItem: any = null;

  constructor(private layoutConfigService: LayoutConfigService) {}

  ngOnInit(): void {
    if (this.items.length > 0) {
      this.activeItem = this.items[0];
      this.tabChange.emit(this.items[0].id);
    }
  }

  selectTab(item: { label: string; id: string }): void {
    this.activeItem = item;
    this.tabChange.emit(item.id);
  }
}
