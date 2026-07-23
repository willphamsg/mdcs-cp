import { Component, OnInit } from '@angular/core';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';

@Component({
  selector: 'app-suspend',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  templateUrl: './suspend.component.html',
  styleUrls: ['./suspend.component.scss'],
})
export class SuspendComponent implements OnInit {
  constructor(private readonly router: Router) {}

  ngOnInit(): void {
    // Wait 2 seconds then redirect based on environment
    setTimeout(() => {
      window.location.href = '/identification/login.html';
    }, 2000);
  }
}
