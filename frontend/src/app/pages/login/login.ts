import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  // Form State
  step = signal<1 | 2>(1);
  email = '';
  password = '';
  otp = '';

  // OTP Session Info
  tempToken = '';
  maskedEmail = '';
  maskedPhone = '';
  devOtp = '';

  loading = signal(false);
  resendCountdown = signal(0);
  private timerRef: any = null;

  ngOnDestroy(): void {
    if (this.timerRef) clearInterval(this.timerRef);
  }

  onSubmitCredentials(): void {
    if (!this.email || !this.password) {
      this.toast.warning('Please enter email and password');
      return;
    }

    this.loading.set(true);
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data?.requireOtp) {
          this.tempToken = res.data.tempToken;
          this.maskedEmail = res.data.maskedEmail;
          this.maskedPhone = res.data.maskedPhone || '';
          this.devOtp = res.data.devOtp || '';
          this.otp = ''; // User enters the OTP received in Email

          this.step.set(2);
          this.toast.info(`6-Digit OTP sent to your Email (${this.maskedEmail})`);
          this.startResendTimer();
        } else {
          this.toast.success('Welcome back!');
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const errMsg = err.error?.message || 'Login failed. Please check credentials.';
        this.toast.error(errMsg);
      }
    });
  }

  onVerifyOtp(): void {
    if (!this.otp || this.otp.trim().length !== 6) {
      this.toast.warning('Please enter valid 6-digit OTP code');
      return;
    }

    this.loading.set(true);
    this.auth.verifyOtp(this.tempToken, this.otp.trim()).subscribe({
      next: () => {
        this.toast.success('OTP verified! Welcome back');
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const errMsg = err.error?.message || 'OTP verification failed. Please try again.';
        this.toast.error(errMsg);
      }
    });
  }

  onResendOtp(): void {
    if (this.resendCountdown() > 0) return;

    this.loading.set(true);
    this.auth.resendOtp(this.tempToken).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.data?.devOtp) {
          this.devOtp = res.data.devOtp;
          this.otp = res.data.devOtp;
        }
        this.toast.success('New OTP sent successfully!');
        this.startResendTimer();
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.error(err.error?.message || 'Failed to resend OTP');
      }
    });
  }

  backToStep1(): void {
    if (this.timerRef) clearInterval(this.timerRef);
    this.step.set(1);
    this.otp = '';
    this.tempToken = '';
  }

  private startResendTimer(): void {
    if (this.timerRef) clearInterval(this.timerRef);
    this.resendCountdown.set(30);
    this.timerRef = setInterval(() => {
      const current = this.resendCountdown();
      if (current <= 1) {
        clearInterval(this.timerRef);
        this.resendCountdown.set(0);
      } else {
        this.resendCountdown.set(current - 1);
      }
    }, 1000);
  }
}
