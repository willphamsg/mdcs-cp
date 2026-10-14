import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonService } from '@app/services/common.service';
import { Subject, takeUntil } from 'rxjs';

const REDIRECT_DELAY_MS = 5000;

@Component({
  selector: 'app-adfs-logout',
  standalone: true,
  imports: [
  ],
  providers: [],
  templateUrl: './adfs-logout.component.html',
})
export class ADFSLogoutComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  settingDefault: any = null;
  sanitizedUrl: SafeResourceUrl | null = null;
  redirect: string;
  private redirectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly commonService: CommonService
  ) {}

  ngOnInit() {
    this.commonService.getSettingDefault()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: value => {
          this.settingDefault = value;
          // ADFS logout iframe requires a trusted resource URL from server config. // NOSONAR
          this.sanitizedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.settingDefault?.logout_url); // NOSONAR
          this.redirect = this.settingDefault?.authenticate_adfs_url;
          
          this.redirectTimer = setTimeout(() => {
            window.location.href = this.redirect;
          }, REDIRECT_DELAY_MS);
        },
      });

  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Leaving this armed navigates the window out of whatever replaced us.
    if (this.redirectTimer !== null) {
      clearTimeout(this.redirectTimer);
      this.redirectTimer = null;
    }
  }

}
