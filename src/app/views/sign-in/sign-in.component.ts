import { Component, inject, OnInit } from '@angular/core';
// import { UserService } from '../../services/user.service';
import { DevLogin, Login, UserProfile } from '../../models/user';
import { MatCardModule } from '@angular/material/card';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { UserService } from '@app/services/user.service';
import { PayloadResponse } from '@app/models/common';
import { CookieService } from 'ngx-cookie-service';
import { MessageService } from '@app/services/message.service';
@Component({
  selector: 'app-sign-in',
  imports: [
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    ReactiveFormsModule,
  ],
  providers: [CookieService],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss'],
})
export class SignInComponent implements OnInit {
  cookieService = inject(CookieService);
  private message = inject(MessageService);
  private ssoSignIn = environment.enableSSO;
  dagw = this.authService.isDagw();
  route = this.dagw ? '/dagw/bus-operation' : '/mdcs/dashboard';
  useDevSign = (environment as any).useDevSign;
  loader: boolean = false;
  form!: FormGroup;
  error: string = '';
  hidePassword: boolean = true;
  constructor(
    // private userService: UserService,
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit() {
    if (this.useDevSign) {
      this.form = this.fb.group(new DevLogin());
      this.applyDevToken(this.cookieService.get('JSESSIONTOKEN'));
    } else {
      this.form = this.fb.group(new Login());
    }

    // const sampleData = this.userService.get(0).subscribe({
    //   next: (value: User[]) => {
    //     console.log(value);
    //   },
    //   error: e => {
    //     console.error(e);
    //     this.loader = false;
    //   },
    //   complete: () => {
    //     console.log(sampleData);
    //     this.loader = false;
    //   },
    // });
  }

  submit() {
    if (this.ssoSignIn) {
      this.authService.login();
    }
    if (this.useDevSign) {
      this.authService.devLogin(this.form.value).subscribe({
        next: (value: { token: '' }) => {
          this.authService.saveToken(value.token);
          this.userService.userProfile().subscribe({
            next: (value: PayloadResponse) => {
              if (value.status == 200) {
                const profile = value.payload as UserProfile;
                this.authService.saveProfile(profile);
                this.redirectBasedOnRole();
              }
            },
          });
        },
      });
    } else {
      sessionStorage.setItem('svdProvId', this.form.value.svc_prov_id);
      if (!environment.useDummyData) {
        this.redirectBasedOnRole();
      } else {
        const { username, password } = this.form.value;
        if (password !== 'password') {
          return;
        }
        if (
          ['admin', 'maintainer', 'supervisor', 'operator', 'lta-sup'].includes(
            username
          )
        ) {
          this.userService.userProfile().subscribe({
            next: (value: PayloadResponse) => {
              if (value.status == 200) {
                const profile = value.payload as UserProfile;
                if (username === 'admin') {
                  profile.access_token_profile.roles = ['adm'];
                  profile.access_token_profile.given_name = 'Administrator';
                } else if (username === 'maintainer') {
                  profile.access_token_profile.roles = ['mai'];
                  profile.access_token_profile.given_name = 'Maintainer';
                } else if (username === 'supervisor') {
                  profile.access_token_profile.roles = ['sup'];
                  profile.access_token_profile.given_name = 'Supervisor';
                } else if (username === 'lta-sup') {
                  profile.access_token_profile.roles = ['sup'];
                  profile.access_token_profile.given_name = 'LTA Supervisor';
                  profile.access_token_profile.is_lta = true;
                } else if (username === 'operator') {
                  profile.access_token_profile.roles = ['ope'];
                  profile.access_token_profile.given_name = 'Operator';
                }
                this.authService.saveProfile(profile);
                this.redirectBasedOnRole();
              }
            },
          });
        }
      }
    }
  }

  applyToken() {
    this.authService.saveToken(this.form.value.token);
    this.userService.userProfile().subscribe({
      next: (value: PayloadResponse) => {
        if (value.status == 200) {
          const profile = value.payload as UserProfile;
          this.authService.saveProfile(profile);
          console.log(this.redirectBasedOnRole());
          this.redirectBasedOnRole();
        }
      },
    });
  }

  applyDevToken(token: string) {
    if (token != '' && token != undefined && token != null) {
      this.authService.saveToken(token);
      this.userService.userProfile().subscribe({
        next: (value: PayloadResponse) => {
          if (value.status == 200) {
            const profile = value.payload as UserProfile;
            this.authService.saveProfile(profile);
            this.redirectBasedOnRole();
          }
        },
      });
    } else {
      if (typeof window !== 'undefined') {
        alert('Token invalid or expired');
      }
    }
  }

  redirectBasedOnRole() {
    const isDagw = this.authService.isDagw();
    const roles = this.authService.getUserRoles();

    let redirectUrl = isDagw ? '/dagw/bus-operation' : '/mdcs/dashboard'; // default

    for (const role of roles) {
      if (role === 'adm') {
        redirectUrl = isDagw
          ? '/dagw/change-password'
          : '/mdcs/maintenance/audit-log';
        break;
      }
      if (role === 'mai') {
        redirectUrl = isDagw
          ? '/dagw/import-parameter'
          : '/mdcs/import-parameter';
        break;
      }
      if (role === 'sup' || role === 'ope') {
        redirectUrl = isDagw ? '/dagw/bus-operation' : '/mdcs/dashboard';
        break;
      }
    }

    this.router.navigate([redirectUrl]);
  }
}
