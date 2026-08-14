import { Component, OnInit, OnDestroy, AfterViewChecked, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService, SendChatMessagePayload } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { SocketService } from '../../core/services/socket.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  private readonly chatService = inject(ChatService);
  private readonly userService = inject(UserService);
  private readonly socketService = inject(SocketService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef;

  messages = signal<any[]>([]);
  teamMembers = signal<any[]>([]);
  newMessage = '';
  searchQuery = '';
  activeChannel = signal('general');

  selectedFile: File | null = null;
  fileUploading = signal(false);
  loading = signal(true);
  sending = signal(false);
  isDraggingFile = signal(false);

  private pollInterval: any;
  private socketSub?: Subscription;
  private shouldScrollToBottom = false;

  ngOnInit(): void {
    this.loadMessages(true);
    this.loadTeamMembers();

    // Listen to live WebSocket message events
    this.socketSub = this.socketService.onEvent<any>('new_message').subscribe((msg) => {
      if (msg && msg.id) {
        this.messages.update((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        this.shouldScrollToBottom = true;
      }
    });

    // Fallback polling for updates
    this.pollInterval = setInterval(() => {
      this.loadMessages(false);
    }, 4000);
  }

  ngOnDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
    if (this.socketSub) this.socketSub.unsubscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  loadTeamMembers(): void {
    this.userService.all().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.teamMembers.set(res.data);
        }
      },
      error: () => {}
    });
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

  triggerFileInput(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.handleFileSelect(file);
    }
  }

  handleFileSelect(file: File): void {
    if (file.size > 25 * 1024 * 1024) {
      this.toast.error('File size exceeds 25 MB limit');
      return;
    }
    this.selectedFile = file;
    this.toast.info(`Attached ${file.name}`);
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(false);
  }

  onDropFile(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDraggingFile.set(false);

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handleFileSelect(file);
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(): void {
    const text = this.newMessage.trim();
    if ((!text && !this.selectedFile) || this.sending() || this.fileUploading()) return;

    this.sending.set(true);

    if (this.selectedFile) {
      this.fileUploading.set(true);
      this.chatService.uploadFile(this.selectedFile).subscribe({
        next: (uploadRes) => {
          this.fileUploading.set(false);
          if (uploadRes.success && uploadRes.data) {
            const payload: SendChatMessagePayload = {
              content: text || undefined,
              fileUrl: uploadRes.data.fileUrl,
              fileName: uploadRes.data.fileName,
              fileType: uploadRes.data.fileType,
              fileSize: uploadRes.data.fileSize,
            };
            this.executeSendMessage(payload);
          } else {
            this.sending.set(false);
            this.toast.error('Failed to upload file');
          }
        },
        error: (err) => {
          this.fileUploading.set(false);
          this.sending.set(false);
          this.toast.error(err.error?.message || 'Failed to upload document');
        }
      });
    } else {
      this.executeSendMessage({ content: text });
    }
  }

  private executeSendMessage(payload: SendChatMessagePayload): void {
    this.chatService.sendMessage(payload).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.messages.update((msgs) => [...msgs, res.data]);
          this.newMessage = '';
          this.removeSelectedFile();
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

  downloadFile(fileUrl?: string, fileName?: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!fileUrl) return;

    const fullUrl = this.getFileUrl(fileUrl);
    const name = fileName || fileUrl.split('/').pop() || 'downloaded-file';

    this.toast.info(`Preparing download: ${name}`);

    fetch(fullUrl)
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
        this.toast.success(`Downloaded ${name}`);
      })
      .catch(() => {
        // Fallback open in new window if blob download fails
        window.open(fullUrl, '_blank');
      });
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  isMyMessage(msg: any): boolean {
    return msg.senderId === this.authService.currentUser()?.id;
  }

  getSenderName(msg: any): string {
    if (!msg?.sender) return 'Team Member';
    return `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim() || 'Team Member';
  }

  filteredMessages(): any[] {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) return this.messages();

    return this.messages().filter((m) => {
      const contentMatch = m.content && m.content.toLowerCase().includes(query);
      const fileMatch = m.fileName && m.fileName.toLowerCase().includes(query);
      const senderMatch = this.getSenderName(m).toLowerCase().includes(query);
      const fileTypeMatch = m.fileType && m.fileType.toLowerCase().includes(query);
      return contentMatch || fileMatch || senderMatch || fileTypeMatch;
    });
  }

  isImageFile(fileType?: string, fileName?: string): boolean {
    if (fileType?.startsWith('image/')) return true;
    if (fileName) {
      const ext = fileName.split('.').pop()?.toLowerCase();
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '');
    }
    return false;
  }

  getFileIcon(fileType?: string, fileName?: string): string {
    if (this.isImageFile(fileType, fileName)) return '🖼️';
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';

    if (['pdf'].includes(ext) || fileType?.includes('pdf')) return '📄';
    if (['doc', 'docx'].includes(ext) || fileType?.includes('word')) return '📝';
    if (['xls', 'xlsx', 'csv'].includes(ext) || fileType?.includes('sheet') || fileType?.includes('excel')) return '📊';
    if (['ppt', 'pptx'].includes(ext) || fileType?.includes('presentation')) return '📊';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
    if (['txt', 'json', 'xml', 'html', 'js', 'ts'].includes(ext)) return '📑';
    return '📁';
  }

  formatFileSize(bytes?: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFileUrl(url?: string): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    let backendUrl = 'http://localhost:3000';
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host !== 'localhost' && host !== '127.0.0.1') {
        if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
          backendUrl = `http://${host}:3000`;
        } else {
          backendUrl = 'https://crm-rfyq.onrender.com';
        }
      }
    }
    return `${backendUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}
