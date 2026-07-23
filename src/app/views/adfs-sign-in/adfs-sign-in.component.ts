import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PageLoaderComponent } from '@app/components/page-loader/page-loader.component';
import { PayloadResponse } from '@app/models/common';
import { UserProfile } from '@app/models/user';
import { AuthService } from '@app/services/auth.service';
import { UserService } from '@app/services/user.service';
import { CookieService } from 'ngx-cookie-service';
import { REFRESH_TOKEN_COOKIE } from '@app/shared/utils/constants';

@Component({
  standalone: true,
  selector: 'app-adfs-sign-in',
  imports: [PageLoaderComponent],
  providers: [CookieService],
  templateUrl: './adfs-sign-in.component.html',
})
export class AdfsSignInComponent implements OnInit {
  redirect = this.authService.isDagw()
    ? '/dagw/bus-operation'
    : '/mdcs/dashboard';
  constructor(
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly router: Router,
    private readonly cookieService: CookieService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(param => {
      this.applyDevToken(param['token']);
    });
  }

  // applyDevToken(token: string) {
  //   if (token != '' && token != undefined && token != null) {
  //     this.authService.saveToken(token);
  //     this.userService.userProfile().subscribe({
  //       next: (value: PayloadResponse) => {
  //         if (value.status == 200) {
  //           const profile = value.payload as UserProfile;
  //           this.authService.saveProfile(profile);
  //           this.router.navigate([this.redirect]);
  //         }
  //       },
  //     });
  //   } else {
  //     if (typeof window !== 'undefined') {
  //       alert('Token invalid or expired');
  //     }
  //   }
  // }
  applyDevToken(token: string) {
    if (token != '' && token !== undefined && token !== null) {
      this.authService.saveToken(token);
      const refreshToken = this.cookieService.get(REFRESH_TOKEN_COOKIE);
      if (refreshToken) {
        this.authService.saveRefreshToken(refreshToken);
      }
      this.userService.userProfile().subscribe({
        next: (value: PayloadResponse) => {
          if (value.status === 200) {
            const profile = value.payload as UserProfile;
            this.authService.saveProfile(profile);

            const isDagw = this.authService.isDagw();
            const roles = this.authService.getUserRoles();
            const redirectUrl = this.resolveRedirectUrl(isDagw, roles);

            this.router.navigate([redirectUrl]);
          }
        },
      });
    } else if (typeof window !== 'undefined') {
      alert('Token invalid or expired');
    }
  }

  private resolveRedirectUrl(isDagw: boolean, roles: string[]): string {
    if (roles.includes('adm')) {
      return isDagw ? '/dagw/change-password' : '/mdcs/maintenance/audit-log';
    }
    if (roles.includes('mai')) {
      return isDagw ? '/dagw/import-parameter' : '/mdcs/import-parameter';
    }

    return isDagw ? '/dagw/bus-operation' : '/mdcs/dashboard';
  }
}
