import { Component } from '@angular/core';
import { MatDialogClose } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-download-dialog',
    imports: [MatDialogClose, MatButtonModule],
    templateUrl: './download-dialog.component.html',
    styleUrl: './download-dialog.component.scss'
})
export class DownloadDialogComponent {}
