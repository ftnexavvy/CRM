import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowService } from '../../core/services/workflow.service';
import { AuthService } from '../../core/services/auth.service';
import { ClientService } from '../../core/services/client.service';
import { FormatEnumPipe } from '../../shared/pipes/format-enum.pipe';
import { RouterLink } from '@angular/router';

export interface ClientPostSummary {
  clientId: string;
  clientName: string;
  totalPosts: number;
  totalReels: number;
  completedCount: number;
  pendingCount: number;
  tasks: any[];
}

@Component({
  selector: 'app-posts',
  imports: [CommonModule, FormatEnumPipe, RouterLink],
  templateUrl: './posts.html',
  styleUrl: './posts.css'
})
export class PostsComponent implements OnInit {
  private readonly workflowService = inject(WorkflowService);
  private readonly clientService = inject(ClientService);
  readonly authService = inject(AuthService);

  posts = signal<any[]>([]);
  selectedClient = signal<ClientPostSummary | null>(null);
  loading = signal(true);
  filterStatus = signal<'ALL' | 'POSTS' | 'REELS' | 'COMPLETED' | 'PENDING'>('ALL');

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.loading.set(true);
    this.workflowService.getPosts().subscribe({
      next: (res) => {
        if (res.success) {
          this.posts.set(res.data || []);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  clientSummaries = computed<ClientPostSummary[]>(() => {
    const all = this.posts();
    const map = new Map<string, ClientPostSummary>();

    all.forEach(task => {
      const rawName = task.clientName || task.workflow?.title?.replace(/^Client Tasks - /i, '') || 'Client';
      const key = rawName.trim().toLowerCase();

      if (key === 'unassigned' || key === 'general client' || key === 'general / unassigned') {
        return;
      }

      if (!map.has(key)) {
        map.set(key, {
          clientId: task.clientId || task.workflow?.subjectId || key,
          clientName: rawName.trim(),
          totalPosts: 0,
          totalReels: 0,
          completedCount: 0,
          pendingCount: 0,
          tasks: []
        });
      }

      const summary = map.get(key)!;
      summary.tasks.push(task);
    });

    for (const summary of map.values()) {
      let configuredPosts = 0;
      let configuredReels = 0;
      let hasConfigured = false;

      const sampleTask = summary.tasks.find(t => t.clientServices && t.clientServices.length > 0);
      if (sampleTask && sampleTask.clientServices && Array.isArray(sampleTask.clientServices)) {
        const smm = sampleTask.clientServices.find((cs: any) => {
          const sName = (cs.service?.name || "").toLowerCase().replace(/\s+/g, "");
          return sName.includes("socialmedia") || sName.includes("smm") || sName.includes("social");
        });
        if (smm && smm.configuration) {
          const cfg = smm.configuration;
          configuredPosts = parseInt(cfg.staticPosts || "0") + parseInt(cfg.carouselPosts || "0");
          configuredReels = parseInt(cfg.reels || "0");
          if (configuredPosts > 0 || configuredReels > 0) {
            hasConfigured = true;
          }
        }
      }

      const deliverableMap = new Map<string, any>();
      summary.tasks.forEach(t => {
        const title = t.title || '';
        const postMatch = title.match(/(Post\s*\d+|Carousel\s*\d+|Story\s*\d+)/i);
        const reelMatch = title.match(/(Reel\s*\d+)/i);
        const isPostOrReelTitle = postMatch || reelMatch || title.toLowerCase().includes('post') || title.toLowerCase().includes('reel') || title.toLowerCase().includes('carousel') || title.toLowerCase().includes('story');
        
        if (!isPostOrReelTitle) {
          return;
        }

        let key = '';
        if (reelMatch) key = 'reel:' + reelMatch[0].toLowerCase();
        else if (postMatch) key = 'post:' + postMatch[0].toLowerCase();
        else key = 'other:' + t.id;

        const existing = deliverableMap.get(key);
        if (!existing || title.startsWith('Publish') || title.startsWith('Schedule')) {
          deliverableMap.set(key, t);
        }
      });

      const uniqueDeliverables = Array.from(deliverableMap.values());
      summary.tasks = uniqueDeliverables;

      const calcPosts = uniqueDeliverables.filter(t => {
        const title = (t.title || '').toLowerCase();
        return !t.type?.includes('REEL') && !title.includes('reel');
      }).length;

      const calcReels = uniqueDeliverables.filter(t => {
        const title = (t.title || '').toLowerCase();
        return t.type === 'REEL' || title.includes('reel');
      }).length;

      summary.totalPosts = hasConfigured ? configuredPosts : calcPosts;
      summary.totalReels = hasConfigured ? configuredReels : calcReels;

      summary.completedCount = uniqueDeliverables.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
      summary.pendingCount = Math.max(0, (summary.totalPosts + summary.totalReels) - summary.completedCount);
    }

    return Array.from(map.values());
  });

  selectClient(summary: ClientPostSummary) {
    this.selectedClient.set(summary);
    this.filterStatus.set('ALL');
  }

  clearSelectedClient() {
    this.selectedClient.set(null);
  }

  filteredClientTasks = computed(() => {
    const summary = this.selectedClient();
    if (!summary) return [];

    const tasks = summary.tasks;
    const filter = this.filterStatus();

    if (filter === 'POSTS') {
      return tasks.filter(t => t.type !== 'REEL' && !(t.title || '').toLowerCase().includes('reel'));
    }
    if (filter === 'REELS') {
      return tasks.filter(t => t.type === 'REEL' || (t.title || '').toLowerCase().includes('reel'));
    }
    if (filter === 'COMPLETED') {
      return tasks.filter(t => t.status === 'COMPLETED' || t.status === 'APPROVED');
    }
    if (filter === 'PENDING') {
      return tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'APPROVED');
    }
    return tasks;
  });

  isCompleted(task: any): boolean {
    return task.status === 'COMPLETED' || task.status === 'APPROVED';
  }

  getTaskPlatform(task: any): { name: string; color: string; icon: string } {
    if (this.isCompleted(task)) {
      return { name: 'Published', color: '#10b981', icon: '✅' };
    }
    return { name: 'Pending Publish', color: '#6b7280', icon: '⏳' };
  }
}
