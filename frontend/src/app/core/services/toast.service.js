import { __decorate } from "tslib";
import { Injectable, signal } from '@angular/core';
let ToastService = class ToastService {
    toasts = signal([]);
    show(message, type = 'info') {
        const id = Math.random().toString(36).substring(2, 9);
        this.toasts.update(current => [...current, { id, type, message }]);
        setTimeout(() => {
            this.remove(id);
        }, 4000);
    }
    success(message) {
        this.show(message, 'success');
    }
    error(message) {
        this.show(message, 'error');
    }
    info(message) {
        this.show(message, 'info');
    }
    warning(message) {
        this.show(message, 'warning');
    }
    remove(id) {
        this.toasts.update(current => current.filter(t => t.id !== id));
    }
};
ToastService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], ToastService);
export { ToastService };
