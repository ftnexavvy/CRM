import { __decorate } from "tslib";
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast';
let App = class App {
    title = signal('frontend');
};
App = __decorate([
    Component({
        selector: 'app-root',
        imports: [RouterOutlet, ToastComponent],
        templateUrl: './app.html',
        styleUrl: './app.css'
    })
], App);
export { App };
