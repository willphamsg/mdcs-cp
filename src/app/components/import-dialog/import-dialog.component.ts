import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-import-dialog',
  imports: [MatButtonModule],
  templateUrl: './import-dialog.component.html',
  styleUrl: './import-dialog.component.scss',
})
export class ImportDialogComponent {}
