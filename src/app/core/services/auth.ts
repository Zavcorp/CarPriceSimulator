import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../services/supabase';
import { User } from '../interfaces/user';

/**
 * Maneja autenticación con Supabase Auth.
 * Expone el estado del usuario como señales de Angular para reactividad.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<User | null>(null);

  /** Usuario actual como señal de solo lectura */
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isAdmin = computed(() => this._user()?.role === 'admin');

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {
    // Restaurar sesión al iniciar la app
    this.initSession();

    // Escuchar cambios de sesión de Supabase
    this.supabase.client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        this._user.set({
          id: session.user.id,
          email: session.user.email!,
          role: 'admin', // En producción, consultar tabla de roles
        });
      } else {
        this._user.set(null);
      }
    });
  }

  private async initSession(): Promise<void> {
    const { data } = await this.supabase.client.auth.getSession();
    if (data.session?.user) {
      this._user.set({
        id: data.session.user.id,
        email: data.session.user.email!,
        role: 'admin',
      });
    }
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this._user.set(null);
    this.router.navigate(['/']);
  }
}