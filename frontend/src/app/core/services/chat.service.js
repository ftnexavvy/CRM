import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
let ChatService = class ChatService {
    http = inject(HttpClient);
    getMessages() {
        return this.http.get('/api/v1/chat');
    }
    sendMessage(content) {
        return this.http.post('/api/v1/chat', { content });
    }
};
ChatService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], ChatService);
export { ChatService };
