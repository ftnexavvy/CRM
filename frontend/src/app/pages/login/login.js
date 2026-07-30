import { __decorate } from "tslib";
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
let LoginComponent = class LoginComponent {
    auth = inject(AuthService);
    router = inject(Router);
    toast = inject(ToastService);
    email = '';
    password = '';
    loading = signal(false);
    onSubmit() {
        if (!this.email || !this.password) {
            this.toast.warning('Please enter email and password');
            return;
        }
        this.loading.set(true);
        this.auth.login({ email: this.email, password: this.password }).subscribe({
            next: () => {
                this.toast.success('Welcome back!');
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.loading.set(false);
                const errMsg = err.error?.message || 'Login failed. Please check credentials.';
                this.toast.error(errMsg);
            }
        });
    }
};
LoginComponent = __decorate([
    Component({
        selector: 'app-login',
        imports: [CommonModule, FormsModule, RouterLink],
        templateUrl: './login.html',
        styleUrl: './login.css'
    })
], LoginComponent);
export { LoginComponent };
