import { Component, signal, inject, OnInit } from '@angular/core';
import { RouterOutlet, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from './core/services/auth';
import { LoginModal } from './shared/components/login-modal/login-modal';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, ButtonModule, ToastModule, LoginModal],
  providers: [MessageService],
  templateUrl: './app.html',
})
export class AppComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly route = inject(ActivatedRoute);
  showLoginModal = signal(false);

  ngOnInit(): void {
    // Abrir login si viene del guard redirect
    this.route.queryParams.subscribe(params => {
      if (params['openLogin']) this.showLoginModal.set(true);
    });
  }

  onLoginSuccess(): void {
    this.showLoginModal.set(false);
  }

  isOpen = true;

  toggleMenu() {
    this.isOpen = !this.isOpen;
  }
}
