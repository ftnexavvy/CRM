import { __decorate } from "tslib";
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
let ToastComponent = class ToastComponent {
    toastService = inject(ToastService);
    toasts = this.toastService.toasts;
};
ToastComponent = __decorate([
    Component({
        selector: 'app-toast',
        imports: [CommonModule],
        templateUrl: './toast.html',
        styleUrl: './toast.css'
    })
], ToastComponent);
export { ToastComponent };
