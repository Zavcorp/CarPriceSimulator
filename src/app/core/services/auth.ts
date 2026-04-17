import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase';
import { User } from '../interfaces/user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User | null>(null);

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'admin');
  readonly isEmployee = computed(() => this._user()?.role === 'employee');

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    this.initSession();

    this.supabase.client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Al cambiar sesión, obtener el rol real desde user_profiles
        const role = await this.fetchUserRole();
        this._user.set({
          id: session.user.id,
          email: session.user.email!,
          role,
        });
      } else {
        this._user.set(null);
      }
    });
  }

  private async initSession(): Promise<void> {
    const { data } = await this.supabase.client.auth.getSession();
    if (data.session?.user) {
      const role = await this.fetchUserRole();
      this._user.set({
        id: data.session.user.id,
        email: data.session.user.email!,
        role,
      });
    }
  }

  /**
   * Consulta el rol del usuario usando la función RPC de Supabase.
   * Usamos la función get_my_role() para no exponer la tabla completa.
   */
  private async fetchUserRole(): Promise<'admin' | 'employee' | 'visitor'> {
    const { data, error } = await this.supabase.client
      .rpc('get_my_role');

    if (error || !data) return 'visitor';
    return data as 'admin' | 'employee' | 'visitor';
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    // onAuthStateChange se encarga de actualizar _user automáticamente
  }

  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this._user.set(null);
    this.router.navigate(['/']);
  }
}