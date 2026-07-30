import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ChatService } from '../../../core/services/chat.service';
import { ActivityService } from '../../../core/services/activity.service';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css'
})
export class LayoutComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly chatService = inject(ChatService);
  private readonly activityService = inject(ActivityService);
  private readonly router = inject(Router);

  protected readonly currentUser = this.authService.currentUser;

  // Notification Signals
  notifications = signal<any[]>([]);
  showNotificationDropdown = signal(false);
  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);

  // Floating Chat Signals
  chatExpanded = signal(false);
  chatMessages = signal<any[]>([]);
  newChatMessageText = '';

  // Global Admin Activity Logs Signals
  adminLogs = signal<any[]>([]);
  logsExpanded = signal(false);

  private pollingTimer: any;

  ngOnInit(): void {
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }
  }

  private startPolling(): void {
    // Initial fetch
    this.fetchData();

    // Poll every 4 seconds
    this.pollingTimer = setInterval(() => {
      this.fetchData();
    }, 4000);
  }

  private fetchData(): void {
    if (!this.authService.accessToken) return;

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

  toggleNotificationDropdown(event: Event): void {
    event.stopPropagation();
    this.showNotificationDropdown.set(!this.showNotificationDropdown());
  }

  markAllAsRead(): void {
    this.notificationService.markAllRead().subscribe({
      next: () => {
        this.fetchData();
      }
    });
  }

  markAsRead(id: string, event: Event): void {
    event.stopPropagation();
    this.notificationService.markAsRead(id).subscribe({
      next: () => {
        this.fetchData();
      }
    });
  }

  toggleChat(): void {
    this.chatExpanded.set(!this.chatExpanded());
    if (this.chatExpanded()) {
      // Scroll chat window to bottom
      setTimeout(() => this.scrollChatToBottom(), 50);
    }
  }

  toggleLogs(): void {
    this.logsExpanded.set(!this.logsExpanded());
  }

  sendChatMessage(event?: Event): void {
    if (event) event.preventDefault();
    if (!this.newChatMessageText.trim()) return;

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

  private scrollChatToBottom(): void {
    const chatBody = document.querySelector('.floating-chat-body');
    if (chatBody) {
      chatBody.scrollTop = chatBody.scrollHeight;
    }
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.router.navigate(['/login']);
    });
  }

  hasPermission(key: string): boolean {
    return this.authService.hasPermission(key);
  }

  getActivityIcon(action: string): string {
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

  isAdminUser(): boolean {
    const roleName = this.currentUser()?.role?.name || this.currentUser()?.role || '';
    return ['ADMINISTRATOR', 'ADMIN'].includes(roleName.toString().toUpperCase());
  }
}
