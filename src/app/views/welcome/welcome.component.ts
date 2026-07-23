import { Component, OnInit } from '@angular/core';
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
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss'],
})
export class WelComeComponent implements OnInit {
  private readonly ssoSignIn = environment.enableSSO;
  dagw = environment.dagw;
  route = this.dagw ? '/dagw/bus-operation' : '/mdcs/dashboard';
  useDevSign = (environment as any).useDevSign;
  loader: boolean = false;
  form!: FormGroup;
  error: string = '';
  hidePassword: boolean = true;
  constructor(
    // private userService: UserService,
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly userService: UserService
  ) {}

  ngOnInit() {
    if (this.useDevSign) {
      this.form = this.fb.group(new DevLogin());
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
          // this.userService.profile().subscribe({
          //   next: (value: PayloadResponse) => {
          //     if (value.status == 200) {
          //       const profile = value.payload as UserProfile;
          //       this.authService.saveProfile(profile);
          //       this.router.navigate([this.route]);
          //     }
          //   },
          // });
          this.userService.userProfile().subscribe({
            next: (value: PayloadResponse) => {
              if (value.status == 200) {
                const profile = value.payload as UserProfile;
                this.authService.saveProfile(profile);
                // this.redirectBasedOnRole();
                this.router.navigate([this.route]);
              }
            },
          });
        },
      });
    } else {
      sessionStorage.setItem('svdProvId', this.form.value.svc_prov_id);
      // this.router.navigate([this.route]);
      this.userService.userProfile().subscribe({
        next: (value: PayloadResponse) => {
          if (value.status == 200) {
            const profile = value.payload as UserProfile;
            this.authService.saveProfile(profile);
            // this.redirectBasedOnRole();
            this.router.navigate([this.route]);
          }
        },
      });
    }
  }

  applyToken() {
    this.authService.saveToken(this.form.value.token);
    // this.userService.profile().subscribe({
    //   next: (value: PayloadResponse) => {
    //     if (value.status == 200) {
    //       const profile = value.payload as UserProfile;
    //       this.authService.saveProfile(profile);
    //       this.router.navigate([this.route]);
    //     }
    //   },
    // });
    this.userService.userProfile().subscribe({
      next: (value: PayloadResponse) => {
        if (value.status == 200) {
          const profile = value.payload as UserProfile;
          this.authService.saveProfile(profile);
          // console.log(this.redirectBasedOnRole());
          // this.redirectBasedOnRole();
          this.router.navigate([this.route]);
        }
      },
    });
  }
}
