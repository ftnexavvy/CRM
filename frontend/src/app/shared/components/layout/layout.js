import { __decorate } from "tslib";
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ChatService } from '../../../core/services/chat.service';
import { ActivityService } from '../../../core/services/activity.service';
let LayoutComponent = class LayoutComponent {
    authService = inject(AuthService);
    notificationService = inject(NotificationService);
    chatService = inject(ChatService);
    activityService = inject(ActivityService);
    router = inject(Router);
    currentUser = this.authService.currentUser;
    // Notification Signals
    notifications = signal([]);
    showNotificationDropdown = signal(false);
    unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);
    // Floating Chat Signals
    chatExpanded = signal(false);
    chatMessages = signal([]);
    newChatMessageText = '';
    // Global Admin Activity Logs Signals
    adminLogs = signal([]);
    logsExpanded = signal(false);
    pollingTimer;
    ngOnInit() {
        this.startPolling();
    }
    ngOnDestroy() {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
        }
    }
    startPolling() {
        // Initial fetch
        this.fetchData();
        // Poll every 4 seconds
        this.pollingTimer = setInterval(() => {
            this.fetchData();
        }, 4000);
    }
    fetchData() {
        if (!this.authService.accessToken)
            return;
        // Load Notifications
        this.notificationService.all().subscribe({
            next: (res) => {
                if (res.success && Array.isArray(res.data)) {
                    this.notifications.set(res.data);
                }
            }
        });
        // Load Chat messages
        this.chatService.getMessages().subscribe({
            next: (res) => {
                if (res.success && Array.isArray(res.data)) {
                    this.chatMessages.set(res.data);
                }
            }
        });
        // Load Admin Activity Logs (if Administrator)
        const roleName = this.currentUser()?.role?.name || this.currentUser()?.role || '';
        const isAdmin = ['ADMINISTRATOR', 'ADMIN'].includes(roleName.toString().toUpperCase());
        if (isAdmin) {
            this.activityService.all(10).subscribe({
                next: (res) => {
                    if (res.success && Array.isArray(res.data)) {
                        this.adminLogs.set(res.data);
                    }
                }
            });
        }
    }
    toggleNotificationDropdown(event) {
        event.stopPropagation();
        this.showNotificationDropdown.set(!this.showNotificationDropdown());
    }
    markAllAsRead() {
        this.notificationService.markAllRead().subscribe({
            next: () => {
                this.fetchData();
            }
        });
    }
    markAsRead(id, event) {
        event.stopPropagation();
        this.notificationService.markAsRead(id).subscribe({
            next: () => {
                this.fetchData();
            }
        });
    }
    toggleChat() {
        this.chatExpanded.set(!this.chatExpanded());
        if (this.chatExpanded()) {
            // Scroll chat window to bottom
            setTimeout(() => this.scrollChatToBottom(), 50);
        }
    }
    toggleLogs() {
        this.logsExpanded.set(!this.logsExpanded());
    }
    sendChatMessage(event) {
        if (event)
            event.preventDefault();
        if (!this.newChatMessageText.trim())
            return;
        const text = this.newChatMessageText;
        this.newChatMessageText = '';
        this.chatService.sendMessage(text).subscribe({
            next: () => {
                this.chatService.getMessages().subscribe(res => {
                    if (res.success && Array.isArray(res.data)) {
                        this.chatMessages.set(res.data);
                        setTimeout(() => this.scrollChatToBottom(), 50);
                    }
                });
            }
        });
    }
    scrollChatToBottom() {
        const chatBody = document.querySelector('.floating-chat-body');
        if (chatBody) {
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    }
    logout() {
        this.authService.logout().subscribe(() => {
            this.router.navigate(['/login']);
        });
    }
    hasPermission(key) {
        return this.authService.hasPermission(key);
    }
    getActivityIcon(action) {
        switch (action) {
            case 'lead_created': return '📣';
            case 'lead_assigned': return '👤';
            case 'lead_status_updated': return '📈';
            case 'lead_converted': return '🏆';
            case 'lead_deleted': return '🗑️';
            case 'workflow_created': return '⚡';
            case 'workflow_assigned': return '👥';
            case 'workflow_transferred': return '🔄';
            case 'workflow_accepted': return '✅';
            case 'workflow_completed': return '📁';
            case 'workflow_approved': return '⭐';
            case 'task_assigned': return '📋';
            case 'task_comment_added': return '💬';
            case 'task_attachment_added': return '📎';
            default: return '⚙️';
        }
    }
    isAdminUser() {
        const roleName = this.currentUser()?.role?.name || this.currentUser()?.role || '';
        return ['ADMINISTRATOR', 'ADMIN'].includes(roleName.toString().toUpperCase());
    }
};
LayoutComponent = __decorate([
    Component({
        selector: 'app-layout',
        imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
        templateUrl: './layout.html',
        styleUrl: './layout.css'
    })
], LayoutComponent);
export { LayoutComponent };
