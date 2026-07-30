import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly chatService = inject(ChatService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messages = signal<any[]>([]);
  newMessage = '';
  loading = signal(true);
  sending = signal(false);
  
  private pollInterval: any;
  private shouldScrollToBottom = false;

  ngOnInit(): void {
    this.loadMessages(true);
    
    // Poll for new messages every 3 seconds
    this.pollInterval = setInterval(() => {
      this.loadMessages(false);
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  loadMessages(initial = false): void {
    if (initial) {
      this.loading.set(true);
    }

    this.chatService.getMessages().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          const oldLen = this.messages().length;
          this.messages.set(res.data);
          
          // Scroll to bottom if it's the initial load or a new message arrived
          if (initial || res.data.length > oldLen) {
            this.shouldScrollToBottom = true;
          }
        }
        if (initial) {
          this.loading.set(false);
        }
      },
      error: () => {
        if (initial) {
          this.loading.set(false);
          this.toast.error('Failed to load chat messages');
        }
      }
    });
  }

  send(): void {
    const text = this.newMessage.trim();
    if (!text || this.sending()) return;

    this.sending.set(true);
    this.chatService.sendMessage(text).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.messages.update((msgs) => [...msgs, res.data]);
          this.newMessage = '';
          this.shouldScrollToBottom = true;
        }
        this.sending.set(false);
      },
      error: (err) => {
        this.sending.set(false);
        this.toast.error(err.error?.message || 'Failed to send message');
      }
    });
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {
      // Ignore scroll errors
    }
  }

  isMyMessage(msg: any): boolean {
    return msg.senderId === this.authService.currentUser()?.id;
  }

  getSenderName(msg: any): string {
    return `${msg.sender.firstName} ${msg.sender.lastName || ''}`.trim();
  }
}
