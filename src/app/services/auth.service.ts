import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthService, AuthConfig } from 'angular-oauth2-oidc';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  filter,
  map,
  Observable,
  ReplaySubject,
} from 'rxjs';
import { environment } from '../../environments/environment';
import {
  HttpBackend,
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import {
  accessList,
  DevLogin,
  IAccessRights,
  UserProfile,
} from '@app/models/user';
import { MessageService } from './message.service';
import { isPlatformBrowser } from '@angular/common';
import AccessList from '@data/access-rights.json';
import { MENU_ACCESS } from './role-access.config';
import { CookieService } from 'ngx-cookie-service';
import { REFRESH_TOKEN_COOKIE } from '@app/shared/utils/constants';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly uri = environment.ssoUri;
  private readonly useDevSign = (environment as any).useDevSign;
  private readonly enableSSO = environment.enableSSO;
  private readonly isAuthenticatedSubject$ = new BehaviorSubject<boolean>(false);
  public readonly isAuthenticated$ = this.isAuthenticatedSubject$.asObservable();

  private readonly isDoneLoadingSubject$ = new ReplaySubject<boolean>();
  public readonly isDoneLoading$ = this.isDoneLoadingSubject$.asObservable();
  private readonly ssoSignIn = environment.enableSSO;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly oAuthService = inject(OAuthService);
  private readonly http = inject(HttpClient);
  private readonly message = inject(MessageService);
  private readonly handler = inject(HttpBackend);
  private readonly cookieService = inject(CookieService);

  public canActivateProtectedRoutes$: Observable<boolean> = combineLatest([
    this.isAuthenticated$,
    this.isDoneLoading$,
  ]).pipe(map(values => values.every(Boolean)));

  private navigateToLoginPage() {
    // Deferred: remember current URL before navigating to login.
    this.router.navigateByUrl('/');
  }

  constructor() {
    if (this.ssoSignIn) {
      this.ssoConfiguration();

      // Initialize auth state for new tabs/windows
      if (isPlatformBrowser(this.platformId)) {
        const hasValidToken = this.oAuthService.hasValidAccessToken();
        this.isAuthenticatedSubject$.next(hasValidToken);
      }

      window.addEventListener('storage', event => {
        // The `key` is `null` if the event was caused by `.clear()`
        if (event.key !== 'access_token' && event.key !== null) {
          return;
        }

        console.warn(
          'Noticed changes to access_token (most likely from another tab), updating isAuthenticated'
        );
        this.isAuthenticatedSubject$.next(
          this.oAuthService.hasValidAccessToken()
        );

        if (!this.oAuthService.hasValidAccessToken()) {
          this.navigateToLoginPage();
        }
      });

      this.oAuthService.events.subscribe(() => {
        this.isAuthenticatedSubject$.next(
          this.oAuthService.hasValidAccessToken()
        );
      });

      this.oAuthService.events
        .pipe(
          filter(e => ['session_terminated', 'session_error'].includes(e.type))
        )
        .subscribe(() => this.navigateToLoginPage());
    } else {
      // For non-SSO mode, initialize loading state immediately
      this.isDoneLoadingSubject$.next(true);
      // Initialize auth state based on token
      if (isPlatformBrowser(this.platformId)) {
        const hasToken = !!this.getToken();
        this.isAuthenticatedSubject$.next(hasToken);
      }
    }
  }

  ssoConfiguration() {
    const authConfig: AuthConfig = {
      issuer: environment.issuer,
      strictDiscoveryDocumentValidation: false,
      clientId: environment.clientId,
      redirectUri: environment.redirectUri,
      tokenEndpoint: environment.tokenEndpoint,
      dummyClientSecret: environment.dummyClientSecret,
      scope: 'openid profile',
      requireHttps: false,
      oidc: true,
      useSilentRefresh: true,
      requestAccessToken: true,
      showDebugInformation: true,
      responseType: 'code',
    };

    this.oAuthService.configure(authConfig);
    this.oAuthService.setupAutomaticSilentRefresh();

    // Check for existing valid token immediately (for new tabs/windows)
    if (isPlatformBrowser(this.platformId)) {
      const hasValidToken = this.oAuthService.hasValidAccessToken();
      this.isAuthenticatedSubject$.next(hasValidToken);
    }

    this.oAuthService
      .loadDiscoveryDocumentAndLogin()
      .then(() => {
        this.isDoneLoadingSubject$.next(true);
        // Update auth state after login check
        this.isAuthenticatedSubject$.next(
          this.oAuthService.hasValidAccessToken()
        );
        if (
          this.oAuthService.state &&
          this.oAuthService.state !== 'undefined' &&
          this.oAuthService.state !== 'null'
        ) {
          let stateUrl = this.oAuthService.state;
          if (stateUrl.startsWith('/') === false) {
            stateUrl = decodeURIComponent(stateUrl);
          }
          console.log(
            `There was state of ${this.oAuthService.state}, so we are sending you to: ${stateUrl}`
          );
          this.router.navigateByUrl(stateUrl);
        }
      })
      .catch(() => {
        this.isDoneLoadingSubject$.next(true);
        // Even if login fails, check if we have a valid token
        if (isPlatformBrowser(this.platformId)) {
          this.isAuthenticatedSubject$.next(
            this.oAuthService.hasValidAccessToken()
          );
        }
      });
  }

  login() {
    this.oAuthService.initImplicitFlow();
  }

  saveToken(token: string) {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('token', token);
    }
  }

  saveRefreshToken(token: string) {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('refresh_token', token);
      this.cookieService.set(REFRESH_TOKEN_COOKIE, token, { path: '/' });
    }
  }

  getRefreshToken(): string {
    if (isPlatformBrowser(this.platformId)) {
      return sessionStorage.getItem('refresh_token') || '';
    }
    return '';
  }

  saveProfile(profile: UserProfile) {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem(
        'svdProvId',
        profile.access_token_profile.svc_prov + ''
      );
      sessionStorage.setItem('profile', JSON.stringify(profile));
    }
  }

  fetchProfile() {
    // if (environment.useDummyData) {
    //   // return this.http
    //   //   .get<any>(`${environment.gateway}user/profile`)
    //   //   .pipe(
    //   //     catchError((err: HttpErrorResponse) => this.message.multiError(err))
    //   //   );
    //   return DummyData['user_profiles'];
    // }
    if (isPlatformBrowser(this.platformId)) {
      return JSON.parse(sessionStorage.getItem('profile') || '{}');
    }
    return {};
  }

  devLogin(params: DevLogin) {
    this.http = new HttpClient(this.handler);
    return this.http
      .post<any>(`${this.uri}token/generate`, params)
      .pipe(
        catchError((err: HttpErrorResponse) => this.message.multiError(err))
      );
  }

  logout() {
    // if (this.useDevSign) {
    //   if (isPlatformBrowser(this.platformId)) {
    //     sessionStorage.clear();
    //   }
    // } else if (this.enableSSO) {
    //   this.oAuthService.revokeTokenAndLogout();
    //   this.oAuthService.logOut();
    // }
    sessionStorage.clear();
    if (isPlatformBrowser(this.platformId)) {
      this.cookieService.delete(REFRESH_TOKEN_COOKIE, '/');
    }
    this.oAuthService.revokeTokenAndLogout();
    this.oAuthService.logOut();
  }

  getProfile() {
    this.oAuthService.loadUserProfile().then((res: any) => {
      return res.info['unique_name'];
    });
  }

  updatePassword() {
    this.oAuthService.loadUserProfile().then((res: any) => {
      const uri = `${environment.issuer}/portal/updatepassword/?UserName=${res.info['unique_name']}`;
      window.open(uri, '_blank');
    });
  }

  getToken() {
    if (this.useDevSign) {
      if (isPlatformBrowser(this.platformId)) {
        return sessionStorage.getItem('token');
      }
      return '';
    } else {
      return this.oAuthService.getAccessToken();
    }
  }

  getSVCProvider() {
    if (this.useDevSign) {
      if (isPlatformBrowser(this.platformId)) {
        return sessionStorage.getItem('svdProvId');
      }
      return '';
    } else {
      return this.oAuthService.getAccessToken();
    }
  }

  isAuthenticated() {
    if (this.useDevSign) {
      if (this.getToken()) {
        return true;
      }
      return false;
    }
    return true;
  }

  getRolesAccess(module: string): accessList {
    const access: IAccessRights[] = AccessList.map((x: IAccessRights) => {
      return x;
    });
    const profile = this.getSessionProfile();
    if (Array.isArray(profile?.access_token_profile?.roles)) {
      const roles = profile.access_token_profile.roles;
      const filtered = access.find(x => roles.includes(x.roles));
      return filtered?.access.find(x => x.module == module)
        ?.access as accessList;
    }
    return {};
  }

  getUserRoles(): string[] {
    const profile = this.fetchProfile();
    return profile?.access_token_profile?.roles || [];
  }

  getUsername(): string {
    const profile = this.fetchProfile();
    return profile?.access_token_profile.user_name || null;
  }

  getDefaultDepot(): number {
    const profile = this.fetchProfile();
    return profile?.default_depot || null;
  }

  getCDALink(): string {
    const profile = this.fetchProfile();
    return profile?.cda_link_url || null;
  }

  getSvcProvCode(): string {
    const profile = this.fetchProfile();
    return profile?.default_svc_prov_code || null;
  }

  getAppMode(): string | null {
    const profile = this.fetchProfile();
    const mode = profile?.app_mode;
    return typeof mode === 'string' ? mode.toLowerCase() : null;
  }

  isDagw(): boolean {
    const profile = this.fetchProfile();
    const mode = profile?.app_mode;
    return typeof mode === 'string' && mode.toLowerCase() === 'dagw';
  }

  isWebSocketEnabled(): boolean {
    const profile = this.fetchProfile();
    const isWebsocketEnabled = profile?.is_websocket_enabled;

    return typeof isWebsocketEnabled === 'boolean' ? isWebsocketEnabled : environment.webSocketEnabled;
  } 
  
  wsUrl(): string | null {
    const profile = this.fetchProfile();
    const url = profile?.websocket_url;
    return typeof url === 'string' ? url : environment.wsUrl || null;
  }

  getValidAccess(params: string[], access: accessList) {
    if (access !== undefined && access !== null) {
      let valid = true;
      params.forEach(element => {
        const rights = access[element];
        if (rights) {
          valid = true;
        } else {
          valid = rights;
        }
      });
      return valid;
    }
    return true;
  }

  getSessionProfile(): UserProfile {
    if (isPlatformBrowser(this.platformId)) {
      const profile = <UserProfile>(
        JSON.parse(sessionStorage.getItem('profile') || '{}')
      );
      return profile;
    }
    return {} as UserProfile;
  }

  hasAccess(path: string[], module: 'mdcs' | 'dagw'): boolean {
    const roles = this.getUserRoles();
    if (!roles.length) return false;
    const access = path.reduce(
      (obj, key) => (obj as any)?.[key],
      MENU_ACCESS[module]
    );
    return Array.isArray(access) && access.some(role => roles.includes(role));
  }

  isLTA(): boolean {
    const profile = this.fetchProfile();
    return (
      profile?.isLTA === true || profile?.access_token_profile?.is_lta === true
    );
  }

  getServiceProviderId(): number {
    const profile = this.fetchProfile();
    return profile?.access_token_profile?.svc_prov;
  }
}
