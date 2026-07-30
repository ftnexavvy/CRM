import { __decorate } from "tslib";
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
let RegisterComponent = class RegisterComponent {
    auth = inject(AuthService);
    router = inject(Router);
    toast = inject(ToastService);
    firstName = '';
    lastName = '';
    email = '';
    password = '';
    companyName = '';
    companyCode = '';
    companyEmail = '';
    loading = signal(false);
    onSubmit() {
        if (!this.firstName || !this.email || !this.password || !this.companyName || !this.companyCode || !this.companyEmail) {
            this.toast.warning('Please fill in all required fields');
            return;
        }
        // Password validation match check (Must contain uppercase, lowercase, number, special char, min length 8)
        const passPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
        if (this.password.length < 8 || !passPattern.test(this.password)) {
            this.toast.error('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character');
            return;
        }
        // Company code check (Only alphanumeric, dash, underscore, min 2 max 50)
        const codePattern = /^[A-Za-z0-9_-]{2,50}$/;
        if (!codePattern.test(this.companyCode)) {
            this.toast.error('Company code must be alphanumeric (2-50 chars) and can include - or _');
            return;
        }
        this.loading.set(true);
        const payload = {
            firstName: this.firstName,
            lastName: this.lastName || undefined,
            email: this.email,
            password: this.password,
            companyName: this.companyName,
            companyCode: this.companyCode,
            companyEmail: this.companyEmail
        };
        this.auth.register(payload).subscribe({
            next: () => {
                this.toast.success('Company and Admin registered successfully!');
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                this.loading.set(false);
                const errMsg = err.error?.message || 'Registration failed. Email or Company Code might already be in use.';
                this.toast.error(errMsg);
            }
        });
    }
};
RegisterComponent = __decorate([
    Component({
        selector: 'app-register',
        imports: [CommonModule, FormsModule, RouterLink],
        templateUrl: './register.html',
        styleUrl: './register.css'
    })
], RegisterComponent);
export { RegisterComponent };
