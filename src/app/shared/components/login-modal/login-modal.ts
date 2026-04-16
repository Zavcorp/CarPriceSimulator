import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DialogModule,
            InputTextModule, PasswordModule, ButtonModule, MessageModule],
  templateUrl: './login-modal.html',
})
export class LoginModal {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() loginSuccess = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get emailControl() { return this.form.get('email')!; }
  get passwordControl() { return this.form.get('password')!; }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    try {
      await this.auth.signIn(
        this.form.value.email,
        this.form.value.password
      );
      this.loginSuccess.emit();
      this.router.navigate(['/admin']);
    } catch (err: any) {
      // Mensaje de error genérico para no exponer detalles del sistema
      this.errorMessage.set('Credenciales inválidas. Verifica tu email y contraseña.');
    } finally {
      this.loading.set(false);
    }
  }

  close(): void {
    this.visibleChange.emit(false);
    this.form.reset();
    this.errorMessage.set('');
  }
}
