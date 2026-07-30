import { __decorate } from "tslib";
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
let ModalComponent = class ModalComponent {
    title = '';
    visible = false;
    close = new EventEmitter();
    onClose() {
        this.close.emit();
    }
};
__decorate([
    Input()
], ModalComponent.prototype, "title", void 0);
__decorate([
    Input()
], ModalComponent.prototype, "visible", void 0);
__decorate([
    Output()
], ModalComponent.prototype, "close", void 0);
ModalComponent = __decorate([
    Component({
        selector: 'app-modal',
        imports: [CommonModule],
        templateUrl: './modal.html',
        styleUrl: './modal.css'
    })
], ModalComponent);
export { ModalComponent };
