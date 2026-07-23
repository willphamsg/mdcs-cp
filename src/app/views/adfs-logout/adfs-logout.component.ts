import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonService } from '@app/services/common.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-adfs-logout',
  standalone: true,
  imports: [
  ],
  providers: [],
  templateUrl: './adfs-logout.component.html',
  styleUrls: ['./adfs-logout.component.scss'],
})
export class ADFSLogoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  settingDefault: any = null;
  sanitizedUrl: SafeResourceUrl | null = null;
  redirect: string;

  constructor(
    private sanitizer: DomSanitizer,
    private commonService: CommonService
  ) {}

  ngOnInit() {
    this.commonService.getSettingDefault()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: value => {
          this.settingDefault = value;
          this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.settingDefault?.logout_url);
          this.redirect = this.settingDefault?.authenticate_adfs_url;
          
          setTimeout(() => {
            window.location.href = this.redirect;
          }, 5000)
        },
      });

  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

}
