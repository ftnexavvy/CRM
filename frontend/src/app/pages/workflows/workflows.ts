import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { DepartmentService } from '../../core/services/department.service';
import { ClientService } from '../../core/services/client.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { FormatEnumPipe } from '../../shared/pipes/format-enum.pipe';
import { ModalComponent } from '../../shared/components/modal/modal';

@Component({
  selector: 'app-workflows',
  imports: [CommonModule, FormsModule, FormatEnumPipe, ModalComponent],
  templateUrl: './workflows.html',
  styleUrl: './workflows.css'
})
export class WorkflowsComponent implements OnInit {
  private readonly workflowService = inject(WorkflowService);
  private readonly departmentService = inject(DepartmentService);
  private readonly clientService = inject(ClientService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  // Lists
  departments = signal<any[]>([]);
  clients = signal<any[]>([]);
  employees = signal<any[]>([]);
  workflows = signal<any[]>([]);

  // Selected state
  selectedDeptId = signal<string>('');
  selectedClientId = signal<string>('');
  selectedWorkflow = signal<any>(null);
  timeline = signal<any[]>([]);
  activeTab = signal<'dashboard' | 'tasks' | 'timeline'>('dashboard');

  AVAILABLE_PLATFORMS = ['Facebook', 'Instagram', 'LinkedIn', 'YouTube', 'X (Twitter)', 'Pinterest'];
  selectedPlatforms: string[] = [];

  // Create workflow modal form
  showCreateModal = false;
  newSubjectType = 'LEAD';
  newSubjectId = '';
  newTitle = '';

  // Assign / Transfer modal form
  showAssignModal = false;
  isTransfer = false;
  assignDeptId = '';
  assignToId = '';
  assignRemarks = '';

  // Reject / Complete / Approve form
  showActionModal = false;
  actionType: 'reject' | 'complete' | 'approve' = 'complete';
  actionRemarks = '';

  // Custom task modal form
  showCustomTaskModal = false;
  customTaskTitle = '';
  customTaskCount = 1;
  customTaskType = 'GENERIC';
  customTaskDepartmentId = '';
  customTaskAssignedToId = '';
  customTaskPriority = 'MEDIUM';
  customTaskDueDate = '';
  customTaskDescription = '';
  customTaskAttachmentName = '';
  customTaskAttachmentUrl = '';

  // Task Details Modal
  showTaskDetailModal = false;
  selectedTask = signal<any>(null);
  newComment = '';
  newAttachmentName = '';
  newAttachmentUrl = '';

  // Helpers
  loadingWorkflows = signal(false);
  loadingDetails = signal(false);
  submitting = signal(false);

  // Sidebar search
  workflowSearchQuery = '';

  filteredWorkflows(): any[] {
    const q = this.workflowSearchQuery.trim().toLowerCase();
    if (!q) return this.workflows();
    return this.workflows().filter((wf: any) =>
      wf.title?.toLowerCase().includes(q) || wf.status?.toLowerCase().includes(q)
    );
  }

  getActorName(actorId: string | null): string {
    if (!actorId) return 'System';
    return this.getEmployeeName(actorId);
  }

  getInitials(name: string): string {
    if (!name || name === 'No employee available in this department') return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  getEventIcon(eventType: string): string {
    const map: Record<string, string> = {
      CREATED: '🆕', ASSIGNED: '👤', ACCEPTED: '✅', REJECTED: '❌',
      COMPLETED: '🏁', APPROVED: '✔️', OVERRIDDEN: '🔄', TASKS_GENERATED: '⚙️',
      TRANSFERRED: '🔀', CANCELLED: '🚫', IN_PROGRESS: '⚡'
    };
    return map[eventType] || '📌';
  }

  // Dynamically determines if a task is locked.
  // A task is UNLOCKED if parent task (by ID or matching title/number) is COMPLETED or APPROVED.
  isTaskLocked(task: any): boolean {
    if (!task) return false;
    if (task.status === 'COMPLETED' || task.status === 'APPROVED') return false;
    if (!task.isLocked && task.status !== 'LOCKED') return false;

    const allTasks = this.selectedWorkflow()?.tasks || [];

    // 1. Check direct parent by ID
    if (task.dependsOnTaskId) {
      const parent = allTasks.find((t: any) => t.id === task.dependsOnTaskId);
      if (parent && (parent.status === 'COMPLETED' || parent.status === 'APPROVED')) {
        return false; // Parent is done -> unlocked!
      }
    }

    // 2. Title / Number matching fallback (e.g. "Schedule & Publish Post 1" -> check "Design Post 1")
    const titleLower = (task.title || '').toLowerCase();
    if (titleLower.includes('schedule') || titleLower.includes('publish')) {
      const numMatch = task.title?.match(/\d+/);
      if (numMatch) {
        const num = numMatch[0];
        const isReel = titleLower.includes('reel');
        const isPost = titleLower.includes('post');
        
        const prereqTasks = allTasks.filter((t: any) => {
          const tTitleLower = (t.title || '').toLowerCase();
          if (tTitleLower.includes('schedule') || tTitleLower.includes('publish')) return false;
          if (isReel && tTitleLower.includes(`reel ${num}`)) return true;
          if (isPost && tTitleLower.includes(`post ${num}`)) return true;
          if (!isReel && !isPost && (tTitleLower.includes(`post ${num}`) || tTitleLower.includes(`reel ${num}`))) return true;
          return false;
        });

        if (prereqTasks.length > 0) {
          const allDone = prereqTasks.every((t: any) => t.status === 'COMPLETED' || t.status === 'APPROVED');
          if (allDone) return false;
        }
      }
    } else if (!task.dependsOnTaskId) {
      // 3. Sequential Unlocking Fallback (e.g., "Design Post 2" unlocks if "Design Post 1" is completed)
      const numMatch = task.title?.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        if (num === 1) {
          return false; // First task in sequence is always unlocked
        } else if (num > 1) {
          const baseTitle = titleLower.replace(numMatch[0], '').trim();
          const prevTaskDone = allTasks.some((t: any) => {
            const tTitleLower = (t.title || '').toLowerCase();
            const tNumMatch = tTitleLower.match(/\d+/);
            if (tNumMatch) {
              const tNum = parseInt(tNumMatch[0], 10);
              const tBaseTitle = tTitleLower.replace(tNumMatch[0], '').trim();
              if (tBaseTitle === baseTitle && tNum === num - 1) {
                return (t.status === 'COMPLETED' || t.status === 'APPROVED');
              }
            }
            return false;
          });
          if (prevTaskDone) {
            return false; // Previous task in sequence is completed -> unlocked!
          }
        }
      }
    }

    return task.isLocked ?? false;
  }

  // Returns info about which task/person this task is waiting on
  getPrerequisiteInfo(task: any): { taskTitle: string; assigneeName: string } | null {
    if (!this.isTaskLocked(task)) return null;
    const allTasks = this.selectedWorkflow()?.tasks || [];
    
    // 1. Explicit
    if (task.dependsOnTaskId) {
      const parent = allTasks.find((t: any) => t.id === task.dependsOnTaskId);
      if (parent) {
        const assigneeName = parent.assignedToId ? this.getEmployeeName(parent.assignedToId) : '—';
        return { taskTitle: parent.title, assigneeName };
      }
    }

    const titleLower = (task.title || '').toLowerCase();

    // 2. Schedule dependency
    if (titleLower.includes('schedule') || titleLower.includes('publish')) {
      const numMatch = task.title?.match(/\d+/);
      if (numMatch) {
        const num = numMatch[0];
        const isReel = titleLower.includes('reel');
        const isPost = titleLower.includes('post');

        const prereqTasks = allTasks.filter((t: any) => {
          const tTitleLower = (t.title || '').toLowerCase();
          if (tTitleLower.includes('schedule') || tTitleLower.includes('publish')) return false;
          if (isReel && tTitleLower.includes(`reel ${num}`)) return true;
          if (isPost && tTitleLower.includes(`post ${num}`)) return true;
          if (!isReel && !isPost && (tTitleLower.includes(`post ${num}`) || tTitleLower.includes(`reel ${num}`))) return true;
          return false;
        });

        const pendingPrereq = prereqTasks.find((t: any) => t.status !== 'COMPLETED' && t.status !== 'APPROVED');
        if (pendingPrereq) {
          const assigneeName = pendingPrereq.assignedToId ? this.getEmployeeName(pendingPrereq.assignedToId) : '—';
          return { taskTitle: pendingPrereq.title, assigneeName };
        }
      }
    } else {
      // 3. Sequential fallback
      const numMatch = task.title?.match(/\d+/);
      if (numMatch) {
        const num = parseInt(numMatch[0], 10);
        if (num > 1) {
          const baseTitle = titleLower.replace(numMatch[0], '').trim();
          const prevTask = allTasks.find((t: any) => {
            const tTitleLower = (t.title || '').toLowerCase();
            const tNumMatch = tTitleLower.match(/\d+/);
            if (tNumMatch) {
              const tNum = parseInt(tNumMatch[0], 10);
              const tBaseTitle = tTitleLower.replace(tNumMatch[0], '').trim();
              return tBaseTitle === baseTitle && tNum === num - 1;
            }
            return false;
          });
          if (prevTask) {
            const assigneeName = prevTask.assignedToId ? this.getEmployeeName(prevTask.assignedToId) : '—';
            return { taskTitle: prevTask.title, assigneeName };
          }
        }
      }
    }

    return null;
  }

  // Returns a short "what to do" hint based on task type/title
  getTaskActionHint(task: any): string {
    const type = (task.type || '').toUpperCase();
    const title = (task.title || '').toLowerCase();
    if (type === 'GRAPHIC' || title.includes('design')) return 'Create design asset';
    if (title.includes('schedule') || title.includes('publish')) return 'Schedule & publish content';
    if (type === 'REEL' || title.includes('edit reel')) return 'Edit & render video';
    if (title.includes('strategy')) return 'Create monthly strategy';
    if (title.includes('calendar')) return 'Plan content calendar';
    if (title.includes('report')) return 'Prepare & send report';
    if (type === 'CONTENT') return 'Manage social content';
    return 'Complete this task';
  }

  // Returns clean client name
  getClientName(wf: any): string {
    if (!wf) return 'Client';
    if (wf.client?.name) return wf.client.name;
    if (wf.title) {
      const parts = wf.title.split('-');
      if (parts.length > 1) return parts[parts.length - 1].trim();
      return wf.title;
    }
    return 'Client';
  }

  // Returns platform information badges for workflow based on actual client selection
  getPlatformsForWorkflow(wf: any): Array<{ name: string; color: string; icon: string }> {
    if (!wf) return [];

    const platformDefs: Record<string, { name: string; color: string; icon: string }> = {
      instagram: { name: 'Instagram', color: '#e1306c', icon: '📸' },
      facebook: { name: 'Facebook', color: '#1877f2', icon: '📘' },
      linkedin: { name: 'LinkedIn', color: '#0a66c2', icon: '💼' },
      twitter: { name: 'Twitter / X', color: '#1da1f2', icon: '🐦' },
      youtube: { name: 'YouTube', color: '#ff0000', icon: '▶️' },
      pinterest: { name: 'Pinterest', color: '#e60023', icon: '📌' },
      threads: { name: 'Threads', color: '#000000', icon: '🧵' }
    };

    const targetPlatforms: Array<{ name: string; color: string; icon: string }> = [];
    const addedKeys = new Set<string>();

    // 1. Try to find client from clients signal or wf.client
    const client = this.clients().find(c => c.id === wf.subjectId) || wf.client;
    if (client && Array.isArray(client.services)) {
      for (const cs of client.services) {
        const config = cs.configuration || {};
        if (Array.isArray(config.platforms)) {
          for (const key of config.platforms) {
            const keyLower = String(key).toLowerCase().trim();
            if (platformDefs[keyLower] && !addedKeys.has(keyLower)) {
              addedKeys.add(keyLower);
              targetPlatforms.push(platformDefs[keyLower]);
            }
          }
        }
      }
    }

    // 2. If client configuration specified platforms, return them directly!
    if (targetPlatforms.length > 0) {
      return targetPlatforms;
    }

    // 3. Fallback: derive from task titles or service names dynamically
    const tasks = wf.tasks || [];
    const text = (wf.title || '') + ' ' + tasks.map((t: any) => (t.title || '') + ' ' + (t.serviceName || '')).join(' ');
    const textLower = text.toLowerCase();

    if (textLower.includes('instagram') || textLower.includes('insta')) {
      targetPlatforms.push(platformDefs['instagram']);
    }
    if (textLower.includes('facebook') || textLower.includes('fb')) {
      targetPlatforms.push(platformDefs['facebook']);
    }
    if (textLower.includes('linkedin') || textLower.includes('b2b')) {
      targetPlatforms.push(platformDefs['linkedin']);
    }
    if (textLower.includes('youtube') || textLower.includes('video')) {
      targetPlatforms.push(platformDefs['youtube']);
    }
    if (textLower.includes('twitter') || textLower.includes('tweet')) {
      targetPlatforms.push(platformDefs['twitter']);
    }

    if (targetPlatforms.length === 0) {
      targetPlatforms.push(platformDefs['instagram']);
    }

    return targetPlatforms;
  }

  // Monthly deliverable summary breakdown (Posts, Reels, Stories, or General Deliverables)
  getDeliverableSummary(wf: any): Array<{ name: string; total: number; completed: number; remaining: number; pct: number }> {
    const tasks = wf?.tasks || [];
    if (tasks.length === 0) return [];
    
    let postTotal = 0, postDone = 0;
    let reelTotal = 0, reelDone = 0;
    let storyTotal = 0, storyDone = 0;
    let otherTotal = 0, otherDone = 0;

    for (const t of tasks) {
      const titleLower = (t.title || '').toLowerCase();
      const isDone = t.status === 'COMPLETED' || t.status === 'APPROVED';
      if (titleLower.includes('post')) {
        postTotal++;
        if (isDone) postDone++;
      } else if (titleLower.includes('reel')) {
        reelTotal++;
        if (isDone) reelDone++;
      } else if (titleLower.includes('story') || titleLower.includes('stories')) {
        storyTotal++;
        if (isDone) storyDone++;
      } else {
        otherTotal++;
        if (isDone) otherDone++;
      }
    }

    const items = [];
    if (postTotal > 0) {
      items.push({ name: 'Posts', total: postTotal, completed: postDone, remaining: Math.max(0, postTotal - postDone), pct: Math.round((postDone / postTotal) * 100) });
    }
    if (reelTotal > 0) {
      items.push({ name: 'Reels', total: reelTotal, completed: reelDone, remaining: Math.max(0, reelTotal - reelDone), pct: Math.round((reelDone / reelTotal) * 100) });
    }
    if (storyTotal > 0) {
      items.push({ name: 'Stories', total: storyTotal, completed: storyDone, remaining: Math.max(0, storyTotal - storyDone), pct: Math.round((storyDone / storyTotal) * 100) });
    }
    if (otherTotal > 0 || items.length === 0) {
      const totalAll = tasks.length;
      const completedAll = postDone + reelDone + storyDone + otherDone;
      items.push({ name: 'Other Tasks', total: otherTotal || totalAll, completed: otherDone || completedAll, remaining: Math.max(0, (otherTotal || totalAll) - (otherDone || completedAll)), pct: Math.round(((otherDone || completedAll) / (otherTotal || totalAll)) * 100) });
    }
    return items;
  }

  // Billing Cycle calculation (Client Onboarding Date -> +1 Month)
  getBillingCycleInfo(wf: any): { start: Date; end: Date; formattedRange: string; daysLeft: number } {
    const start = wf?.createdAt ? new Date(wf.createdAt) : new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const formattedRange = `${start.toLocaleDateString('en-IN', opts)} → ${end.toLocaleDateString('en-IN', opts)}`;
    return { start, end, formattedRange, daysLeft };
  }

  cleanTitle(title: string | null | undefined): string {
    if (!title) return '';
    return title.replace(/Client Onboarding/gi, 'Client Tasks');
  }

  // Get Task Due Date directly from backend
  getCalculatedTaskDueDate(task: any, wf: any): Date | null {
    if (task?.dueDate) return new Date(task.dueDate);
    return null; // Fallback if no due date was assigned
  }

  // Campaign Metrics
  getCampaignMetrics() {
    const wf = this.selectedWorkflow();
    if (!wf || !wf.tasks || wf.tasks.length === 0) return { totalPosts: 0, completedPosts: 0, remainingPosts: 0, totalReels: 0, completedReels: 0, remainingReels: 0, progressPercent: 0 };

    const postItems = new Map<string, boolean>();
    const reelItems = new Map<string, boolean>();
    let totalCampaignTasks = 0;
    let completedCampaignTasks = 0;

    for (const task of wf.tasks) {
      const isDone = task.status === 'COMPLETED' || task.status === 'APPROVED';
      totalCampaignTasks++;
      if (isDone) completedCampaignTasks++;

      const title = task.title || '';
      const postMatch = title.match(/(Post\s*\d+|Carousel\s*\d+|Story\s*\d+)/i);
      const reelMatch = title.match(/(Reel\s*\d+)/i);

      if (reelMatch) {
        const key = reelMatch[0].toLowerCase();
        const prevDone = reelItems.get(key) || false;
        reelItems.set(key, prevDone || (title.startsWith('Publish') && isDone));
      } else if (postMatch) {
        const key = postMatch[0].toLowerCase();
        const prevDone = postItems.get(key) || false;
        postItems.set(key, prevDone || (title.startsWith('Publish') && isDone));
      }
    }

    const totalPosts = postItems.size;
    const completedPosts = Array.from(postItems.values()).filter(Boolean).length;

    const totalReels = reelItems.size;
    const completedReels = Array.from(reelItems.values()).filter(Boolean).length;

    const progressPercent = totalCampaignTasks > 0 ? Math.round((completedCampaignTasks / totalCampaignTasks) * 100) : 0;

    return {
      totalPosts,
      completedPosts,
      remainingPosts: Math.max(0, totalPosts - completedPosts),
      totalReels,
      completedReels,
      remainingReels: Math.max(0, totalReels - completedReels),
      progressPercent
    };
  }

  isTaskOverdue(task: any): boolean {
    if (task.status === 'COMPLETED' || task.status === 'APPROVED') return false;
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // compare days
    due.setHours(0, 0, 0, 0);
    return due < today;
  }

  // Priority widgets aggregation: Today, Tomorrow, Overdue tasks
  todayPriorityTasks(): { today: any[]; tomorrow: any[]; overdue: any[] } {
    const wf = this.selectedWorkflow();
    if (!wf) return { today: [], tomorrow: [], overdue: [] };

    const currentUserId = this.authService.currentUser()?.id;
    let tasks = wf.tasks || [];
    if (!this.isAdminUser() && currentUserId) {
      tasks = tasks.filter((t: any) => t.assignedToId === currentUserId);
    }

    const todayStr = new Date().toDateString();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toDateString();

    const today: any[] = [];
    const tom: any[] = [];
    const overdue: any[] = [];

    for (const task of tasks) {
      if (task.status === 'COMPLETED' || task.status === 'APPROVED') continue;

      const dueDate = this.getCalculatedTaskDueDate(task, wf);
      if (!dueDate) continue;
      const dueStr = dueDate.toDateString();
      
      const due = new Date(dueDate);
      const now = new Date();
      due.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);

      if (due < now) {
        overdue.push({ ...task, computedDueDate: dueDate });
      } else if (dueStr === todayStr || task.status === 'IN_PROGRESS') {
        today.push({ ...task, computedDueDate: dueDate });
      } else if (dueStr === tomorrowStr) {
        tom.push({ ...task, computedDueDate: dueDate });
      }
    }

    // If today is empty, populate with first 3 active pending tasks
    if (today.length === 0) {
      const activePending = tasks.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'APPROVED').slice(0, 3);
      today.push(...activePending.map((t: any) => ({ ...t, computedDueDate: this.getCalculatedTaskDueDate(t, wf) })));
    }

    return { today, tomorrow: tom, overdue };
  }

  // Team Coordination Pipeline for Task Detail Modal
  getTeamCoordinationSteps(task: any): Array<{ role: string; name: string; status: string; isCurrent: boolean; icon: string }> {
    const wf = this.selectedWorkflow();
    if (!task || !wf) return [];
    const allTasks = wf.tasks || [];

    const steps = [];

    // Previous Step (Prerequisite)
    if (task.dependsOnTaskId) {
      const parent = allTasks.find((t: any) => t.id === task.dependsOnTaskId);
      if (parent) {
        const parentDone = parent.status === 'COMPLETED' || parent.status === 'APPROVED';
        steps.push({
          role: parent.serviceName || 'Graphics Designer',
          name: parent.assignedToId ? this.getEmployeeName(parent.assignedToId) : 'Design Team',
          status: parentDone ? 'Completed ✅' : 'In Progress ⚡',
          isCurrent: false,
          icon: parentDone ? '✅' : '⏳'
        });
      }
    } else {
      steps.push({
        role: 'Client Onboarding',
        name: 'Account Manager',
        status: 'Completed ✅',
        isCurrent: false,
        icon: '✅'
      });
    }

    // Current Step
    const meName = task.assignedToId ? this.getEmployeeName(task.assignedToId) : this.getEmployeeName(this.authService.currentUser()?.id);
    const taskDone = task.status === 'COMPLETED' || task.status === 'APPROVED';
    steps.push({
      role: task.serviceName || 'Social Media Manager',
      name: meName,
      status: taskDone ? 'Completed ✅' : task.status === 'IN_PROGRESS' ? 'In Progress ⚡' : 'Pending ⭕',
      isCurrent: true,
      icon: '⚡'
    });

    // Next Step
    steps.push({
      role: 'Account Manager / Client',
      name: 'Client Approval',
      status: taskDone ? 'In Progress ⚡' : 'Waiting ⏳',
      isCurrent: false,
      icon: '⏳'
    });

    return steps;
  }

  // Detect platform name for a specific task
  getTaskPlatform(task: any): { name: string; color: string; icon: string } {
    if (task?.status === 'COMPLETED' || task?.status === 'APPROVED') {
      return { name: 'Published', color: '#10b981', icon: '✅' };
    }
    return { name: 'Pending Publish', color: '#6b7280', icon: '⏳' };
  }



  ngOnInit(): void {
    this.loadInitialData();
    this.route.queryParams.subscribe(params => {
      const workflowId = params['id'];
      if (workflowId) {
        this.selectWorkflow(workflowId);
      }
    });
  }

  loadInitialData(): void {
    // Load departments
    this.departmentService.all().subscribe(res => {
      if (res.success && Array.isArray(res.data)) {
        this.departments.set(res.data);
        if (res.data.length > 0 && !this.selectedDeptId()) {
          this.selectedDeptId.set(res.data[0].id);
          this.loadDepartmentWorkflows();
        }
      }
    });

    // Load active employees
    this.userService.all().subscribe(res => {
      if (res.success && Array.isArray(res.data)) {
        this.employees.set(res.data.filter((e: any) => e.status === 'ACTIVE'));
      }
    });

    // Load clients
    this.clientService.all().subscribe(res => {
      if (res.success && Array.isArray(res.data)) {
        this.clients.set(res.data);
      }
    });
  }

  loadDepartmentWorkflows(): void {
    if (!this.selectedDeptId()) return;
    this.loadingWorkflows.set(true);
    this.workflowService.departmentQueue(this.selectedDeptId()).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          let wfs = res.data;
          // Non-admin employees: only show workflows where they have tasks
          if (!this.isAdminUser()) {
            const currentUserId = this.authService.currentUser()?.id;
            if (currentUserId) {
              wfs = wfs.filter((wf: any) =>
                wf.tasks?.some((t: any) => t.assignedToId === currentUserId)
              );
            }
          }
          this.workflows.set(wfs);
        }
        this.loadingWorkflows.set(false);
      },
      error: () => this.loadingWorkflows.set(false)
    });
  }

  loadClientWorkflows(): void {
    if (!this.selectedClientId()) return;
    this.loadingWorkflows.set(true);
    this.workflowService.bySubject('CLIENT', this.selectedClientId()).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.workflows.set(res.data);
        }
        this.loadingWorkflows.set(false);
      },
      error: () => this.loadingWorkflows.set(false)
    });
  }

  onDeptChange(): void {
    this.selectedClientId.set('');
    this.loadDepartmentWorkflows();
  }

  onClientChange(): void {
    this.selectedDeptId.set('');
    this.loadClientWorkflows();
  }

  selectWorkflow(id: string): void {
    this.activeTab.set('dashboard');
    this.loadingDetails.set(true);
    this.router.navigate([], { queryParams: { id }, queryParamsHandling: 'merge' });
    
    // Load workflow one
    this.workflowService.one(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectedWorkflow.set(res.data);
          this.loadTimeline(id);
        } else {
          this.loadingDetails.set(false);
        }
      },
      error: () => {
        this.loadingDetails.set(false);
        this.toast.error('Failed to load workflow details');
      }
    });
  }

  loadTimeline(id: string): void {
    this.workflowService.timeline(id).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.timeline.set(res.data);
        }
        this.loadingDetails.set(false);
      },
      error: () => this.loadingDetails.set(false)
    });
  }

  // Action: Create Workflow
  onCreateWorkflow(): void {
    if (!this.newSubjectType || !this.newSubjectId || !this.newTitle) {
      this.toast.warning('All fields are required');
      return;
    }

    this.submitting.set(true);
    this.workflowService.create({
      subjectType: this.newSubjectType,
      subjectId: this.newSubjectId,
      title: this.newTitle
    }).subscribe({
      next: (res) => {
        this.toast.success('Workflow started successfully!');
        this.showCreateModal = false;
        this.newSubjectId = '';
        this.newTitle = '';
        this.submitting.set(false);
        
        // Refresh
        this.loadDepartmentWorkflows();
        if (res.data?.id) {
          this.selectWorkflow(res.data.id);
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to start workflow');
      }
    });
  }

  deleteWorkflow(id: string): void {
    if (!confirm('Are you sure you want to delete this workflow? All associated tasks, history, and assignments will be permanently removed.')) {
      return;
    }

    this.submitting.set(true);
    this.workflowService.delete(id).subscribe({
      next: () => {
        this.toast.success('Workflow deleted successfully');
        this.submitting.set(false);
        this.selectedWorkflow.set(null);
        this.router.navigate([], { queryParams: { id: null }, queryParamsHandling: 'merge' });
        
        // Refresh appropriate list
        if (this.selectedClientId()) {
          this.loadClientWorkflows();
        } else {
          this.loadDepartmentWorkflows();
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to delete workflow');
      }
    });
  }

  // Action: Open Assign / Transfer modal
  openAssignModal(transfer = false): void {
    this.isTransfer = transfer;
    const wf = this.selectedWorkflow();
    if (wf) {
      this.assignDeptId = wf.currentDepartmentId || '';
      // Set active assignment details if transfer
      const activeAssign = wf.assignments?.[0];
      if (activeAssign && transfer) {
        this.assignToId = activeAssign.assignedToId;
      } else {
        this.assignToId = '';
      }
    }
    this.assignRemarks = '';
    this.showAssignModal = true;
  }

  onAssignSubmit(): void {
    const wf = this.selectedWorkflow();
    if (!wf) return;

    if (!this.assignToId || !this.assignDeptId) {
      this.toast.warning('Assignee and Department are required');
      return;
    }

    this.submitting.set(true);
    const dto = {
      assignedToId: this.assignToId,
      departmentId: this.assignDeptId,
      remarks: this.assignRemarks || undefined
    };

    const action$ = this.isTransfer 
      ? this.workflowService.transfer(wf.id, dto) 
      : this.workflowService.assign(wf.id, dto);

    action$.subscribe({
      next: () => {
        this.toast.success(this.isTransfer ? 'Workflow transferred successfully' : 'Workflow assigned successfully');
        this.showAssignModal = false;
        this.submitting.set(false);
        this.selectWorkflow(wf.id);
        this.loadDepartmentWorkflows();
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to assign workflow');
      }
    });
  }

  // Action: Accept workflow
  acceptWorkflow(): void {
    const wf = this.selectedWorkflow();
    if (!wf) return;

    this.loadingDetails.set(true);
    this.workflowService.accept(wf.id).subscribe({
      next: () => {
        this.toast.success('Workflow accepted');
        this.selectWorkflow(wf.id);
        this.loadDepartmentWorkflows();
      },
      error: (err) => {
        this.loadingDetails.set(false);
        this.toast.error(err.error?.message || 'Failed to accept workflow');
      }
    });
  }

  // Action: Open Action Modal (Reject / Complete / Approve)
  openActionModal(type: 'reject' | 'complete' | 'approve'): void {
    this.actionType = type;
    this.actionRemarks = '';
    this.showActionModal = true;
  }

  onActionSubmit(): void {
    const wf = this.selectedWorkflow();
    if (!wf) return;

    this.submitting.set(true);
    let action$;
    if (this.actionType === 'reject') {
      action$ = this.workflowService.reject(wf.id, this.actionRemarks);
    } else if (this.actionType === 'complete') {
      action$ = this.workflowService.complete(wf.id, this.actionRemarks);
    } else {
      action$ = this.workflowService.approve(wf.id, this.actionRemarks);
    }

    action$.subscribe({
      next: () => {
        this.toast.success(`Workflow action (${this.actionType}) completed!`);
        this.showActionModal = false;
        this.submitting.set(false);
        this.selectWorkflow(wf.id);
        this.loadDepartmentWorkflows();
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Action execution failed');
      }
    });
  }

  getFilteredCustomTaskEmployees(): any[] {
    if (!this.customTaskDepartmentId) return this.employees();
    const dept = this.departments().find(d => d.id === this.customTaskDepartmentId);
    if (!dept) return this.employees();
    const deptNameLower = dept.name.toLowerCase();
    const deptCodeLower = dept.code.toLowerCase();

    return this.employees().filter(e => {
      const uDept = (e.department || '').toLowerCase();
      const uDesig = (e.designation || '').toLowerCase();
      return (
        e.departmentId === dept.id ||
        uDept === deptNameLower ||
        uDept === deptCodeLower ||
        uDept.includes(deptNameLower) ||
        (deptNameLower.includes('graphic') && (uDept.includes('graphic') || uDesig.includes('graphic'))) ||
        (deptNameLower.includes('social') && (uDept.includes('social') || uDesig.includes('social'))) ||
        (deptNameLower.includes('video') && (uDept.includes('video') || uDesig.includes('video'))) ||
        (deptNameLower.includes('account') && (uDept.includes('account') || uDesig.includes('account')))
      );
    });
  }

  onCustomTaskDeptChange(): void {
    const available = this.getFilteredCustomTaskEmployees();
    if (available.length > 0) {
      this.customTaskAssignedToId = available[0].id;
    } else {
      this.customTaskAssignedToId = '';
    }
  }

  openCustomTaskModal(): void {
    const wf = this.selectedWorkflow();
    if (!wf) return;

    this.customTaskTitle = '';
    this.customTaskCount = 1;
    this.customTaskType = 'GENERIC';
    this.customTaskDepartmentId = wf.currentDepartmentId || this.departments()[0]?.id || '';
    this.customTaskPriority = 'MEDIUM';
    this.customTaskDueDate = '';
    this.customTaskDescription = '';
    this.customTaskAttachmentName = '';
    this.customTaskAttachmentUrl = '';
    this.onCustomTaskDeptChange();
    this.showCustomTaskModal = true;
  }

  onCreateCustomTask(): void {
    const wf = this.selectedWorkflow();
    if (!wf) return;

    if (!this.customTaskTitle.trim() || !this.customTaskDepartmentId) {
      this.toast.warning('Task title and service/department are required');
      return;
    }

    this.submitting.set(true);

    const count = Math.max(1, parseInt(String(this.customTaskCount || 1), 10));
    const requests = [];

    const formattedDueDate = this.customTaskDueDate ? new Date(this.customTaskDueDate).toISOString() : undefined;

    for (let i = 1; i <= count; i++) {
      const taskTitle = count > 1 ? `${this.customTaskTitle.trim()} ${i}` : this.customTaskTitle.trim();
      const dto = {
        title: taskTitle,
        type: this.customTaskType,
        departmentId: this.customTaskDepartmentId,
        assignedToId: this.customTaskAssignedToId || undefined,
        priority: this.customTaskPriority,
        dueDate: formattedDueDate,
        description: this.customTaskDescription || undefined,
        serviceName: 'Custom Tasks',
        attachments: this.customTaskAttachmentName && this.customTaskAttachmentUrl
          ? [{ fileName: this.customTaskAttachmentName, fileUrl: this.customTaskAttachmentUrl }]
          : undefined
      };
      requests.push(this.workflowService.createCustomTask(wf.id, dto));
    }

    let completedCount = 0;
    requests.forEach(req => {
      req.subscribe({
        next: () => {
          completedCount++;
          if (completedCount === requests.length) {
            this.toast.success(count > 1 ? `${count} custom tasks added!` : 'Custom task added!');
            this.showCustomTaskModal = false;
            this.submitting.set(false);
            this.selectWorkflow(wf.id);
          }
        },
        error: (err) => {
          this.submitting.set(false);
          this.toast.error(err.error?.message || 'Failed to add custom task');
        }
      });
    });
  }

  regenerateWorkflow(): void {
    const wf = this.selectedWorkflow();
    if (!wf || !confirm('Regenerate this workflow from the latest service templates? Custom tasks will be kept.')) return;

    this.submitting.set(true);
    this.workflowService.regenerate(wf.id).subscribe({
      next: () => {
        this.toast.success('Workflow regenerated from service templates');
        this.submitting.set(false);
        this.selectWorkflow(wf.id);
        if (this.selectedClientId()) this.loadClientWorkflows(); else this.loadDepartmentWorkflows();
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to regenerate workflow');
      }
    });
  }

  // Modal: Open Task Detail
  openTaskDetail(task: any): void {
    this.selectedTask.set(task);
    this.selectedPlatforms = task.publishedPlatforms ? [...task.publishedPlatforms] : [];
    this.newComment = '';
    this.newAttachmentName = '';
    this.newAttachmentUrl = '';
    this.showTaskDetailModal = true;
  }

  assignTask(assignedToId: string): void {
    const task = this.selectedTask();
    if (!task) return;

    this.workflowService.assignTask(task.id, assignedToId).subscribe({
      next: () => {
        this.toast.success('Task assigned successfully!');
        // Refresh details
        this.refreshSelectedTask();
        this.selectWorkflow(this.selectedWorkflow().id);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to assign task');
      }
    });
  }

  addComment(): void {
    const task = this.selectedTask();
    if (!task || !this.newComment) return;

    this.workflowService.commentTask(task.id, this.newComment).subscribe({
      next: (res) => {
        this.toast.success('Comment added');
        this.newComment = '';
        this.refreshSelectedTask();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to add comment');
      }
    });
  }

  addAttachment(): void {
    const task = this.selectedTask();
    if (!task || !this.newAttachmentName || !this.newAttachmentUrl) return;

    this.workflowService.attachTask(task.id, {
      fileName: this.newAttachmentName,
      fileUrl: this.newAttachmentUrl
    }).subscribe({
      next: () => {
        this.toast.success('Attachment added');
        this.newAttachmentName = '';
        this.newAttachmentUrl = '';
        this.refreshSelectedTask();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to add attachment');
      }
    });
  }

  private refreshSelectedTask(): void {
    const task = this.selectedTask();
    const wf = this.selectedWorkflow();
    if (!task || !wf) return;

    this.workflowService.one(wf.id).subscribe(res => {
      if (res.success && res.data) {
        this.selectedWorkflow.set(res.data);
        const updatedTask = res.data.tasks?.find((t: any) => t.id === task.id);
        if (updatedTask) {
          this.selectedTask.set(updatedTask);
        }
      }
    });
  }

  // True only if current user is the workflow-level assignee (dept lead)
  // → Used for workflow Accept / Reject actions
  isWorkflowAssignee(): boolean {
    const wf = this.selectedWorkflow();
    if (!wf) return false;
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return false;
    const activeAssign = wf.assignments?.[0];
    return activeAssign?.assignedToId === currentUserId &&
           (activeAssign.status === 'ASSIGNED' || activeAssign.status === 'ACCEPTED');
  }

  // True if current user has at least one task in this workflow
  canAct(): boolean {
    const wf = this.selectedWorkflow();
    if (!wf) return false;
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return false;
    return wf.tasks?.some((t: any) => t.assignedToId === currentUserId) || this.isWorkflowAssignee();
  }

  myTasksCount(): number {
    const wf = this.selectedWorkflow();
    if (!wf) return 0;
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return 0;
    return wf.tasks?.filter((t: any) => t.assignedToId === currentUserId).length || 0;
  }

  updateTaskStatusFromModal(status: string): void {
    const task = this.selectedTask();
    if (!task) return;
    if (this.isTaskLocked(task) && status === 'COMPLETED') {
      this.toast.warning('🔒 This task is locked! Complete prerequisite tasks first.');
      return;
    }

    const payload = { status, publishedPlatforms: this.selectedPlatforms };

    this.workflowService.updateTaskStatus(task.id, payload).subscribe({
      next: () => {
        this.toast.success(status === 'COMPLETED' ? 'Task completed! Downstream tasks unlocked 🔓' : 'Task status updated');
        const wf = this.selectedWorkflow();
        if (wf) this.selectWorkflow(wf.id);
        this.refreshSelectedTask();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to update task status');
      }
    });
  }

  getEmployeeName(id: string | null | undefined): string {
    if (!id) return '—';
    const emp = this.employees().find(e => e.id === id);
    if (emp) return `${emp.firstName} ${emp.lastName || ''}`.trim();
    // Fallback: if employees list is empty/restricted, check if it's current user
    const me = this.authService.currentUser();
    if (me && me.id === id) {
      return `${me.firstName || ''} ${me.lastName || ''}`.trim() || me.email || 'You';
    }
    return '—';
  }

  togglePlatform(platform: string): void {
    const index = this.selectedPlatforms.indexOf(platform);
    if (index > -1) {
      this.selectedPlatforms.splice(index, 1);
    } else {
      this.selectedPlatforms.push(platform);
    }
  }

  selectAllPlatforms(): void {
    if (this.selectedPlatforms.length === this.AVAILABLE_PLATFORMS.length) {
      this.selectedPlatforms = [];
    } else {
      this.selectedPlatforms = [...this.AVAILABLE_PLATFORMS];
    }
  }

  getDepartmentName(id: string | null): string {
    if (!id) return '—';
    const dept = this.departments().find(d => d.id === id);
    return dept ? dept.name : '—';
  }

  getFilteredEmployees(): any[] {
    if (!this.assignDeptId) return this.employees();
    const dept = this.departments().find(d => d.id === this.assignDeptId);
    if (!dept) return this.employees();
    const deptNameLower = dept.name.toLowerCase();
    const deptCodeLower = dept.code.toLowerCase();

    return this.employees().filter(e => {
      const uDept = (e.department || '').toLowerCase();
      const uDesig = (e.designation || '').toLowerCase();
      return (
        e.departmentId === dept.id ||
        uDept === deptNameLower ||
        uDept === deptCodeLower ||
        uDept.includes(deptNameLower) ||
        (deptNameLower.includes('social') && (uDept.includes('social') || uDesig.includes('social'))) ||
        (deptNameLower.includes('graphic') && (uDept.includes('graphic') || uDesig.includes('graphic'))) ||
        (deptNameLower.includes('video') && (uDept.includes('video') || uDesig.includes('video'))) ||
        (deptNameLower.includes('account') && (uDept.includes('account') || uDesig.includes('account')))
      );
    });
  }

  workflowStats(): any {
    const tasks = this.selectedWorkflow()?.tasks || [];
    const completed = tasks.filter((task: any) => task.status === 'COMPLETED' || task.status === 'APPROVED').length;
    const overdue = tasks.filter((task: any) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' && task.status !== 'APPROVED').length;
    const total = tasks.length;
    return {
      total,
      completed,
      pending: Math.max(total - completed, 0),
      overdue,
      progress: total ? Math.round((completed / total) * 100) : 0,
    };
  }

  toggleTaskStatus(task: any): void {
    if (this.isTaskLocked(task)) {
      this.toast.warning('🔒 This task is locked! Complete prerequisite tasks first (e.g. Client Approval).');
      return;
    }
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    const payload = { status: newStatus };
    this.workflowService.updateTaskStatus(task.id, payload).subscribe({
      next: () => {
        this.toast.success(newStatus === 'COMPLETED' ? 'Task completed! Downstream tasks unlocked 🔓' : 'Task status updated');
        const wf = this.selectedWorkflow();
        if (wf) this.selectWorkflow(wf.id);
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to update task status');
      }
    });
  }

  isAdminUser(): boolean {
    const roleName = this.authService.currentUser()?.role?.name || this.authService.currentUser()?.role || '';
    return ['ADMINISTRATOR', 'ADMIN'].includes(roleName.toString().toUpperCase());
  }

  serviceSections(): any[] {
    let tasks = this.selectedWorkflow()?.tasks || [];
    const currentUserId = this.authService.currentUser()?.id;

    // If non-admin employee, filter to show only tasks assigned to them!
    if (!this.isAdminUser() && currentUserId) {
      tasks = tasks.filter((t: any) => t.assignedToId === currentUserId);
    }

    const grouped = new Map<string, any>();

    for (const task of tasks) {
      let deptKey = task.departmentId;
      let cardType = 'custom';
      let cardName = task.serviceName || 'Tasks';

      const taskType = (task.type || '').toUpperCase();
      const titleLower = (task.title || '').toLowerCase();
      const serviceLower = (task.serviceName || '').toLowerCase();

      // NOTE: "Design Reel Cover" is a GRAPHIC task (type=GRAPHIC), not a video task.
      // Check GRAPHIC first before reel/video to avoid misclassification.
      if (taskType === 'GRAPHIC' || titleLower.startsWith('design ') || titleLower.includes('story') || titleLower.includes('carousel')) {
        deptKey = task.departmentId || 'dept_graphics';
        cardType = 'graphics';
        cardName = 'Graphics Design Deliverables';
      } else if (taskType === 'REEL' || taskType === 'VIDEO' || titleLower.includes('edit reel') || titleLower.includes('video')) {
        deptKey = task.departmentId || 'dept_video';
        cardType = 'video';
        cardName = 'Video Editing & Reels Deliverables';
      } else if (taskType === 'CONTENT' || serviceLower.includes('social') || titleLower.includes('strategy') || titleLower.includes('calendar') || titleLower.includes('scheduling') || titleLower.includes('publishing') || titleLower.includes('schedule & publish') || titleLower.includes('monthly report')) {
        deptKey = task.departmentId || 'dept_social';
        cardType = 'social';
        cardName = 'Social Media Management';
      } else {
        deptKey = task.serviceId || 'dept_general';
      }

      if (!grouped.has(deptKey)) {
        grouped.set(deptKey, {
          key: deptKey,
          name: cardName,
          cardType,
          departmentId: task.departmentId,
          assignedToId: task.assignedToId,
          tasks: []
        });
      }
      grouped.get(deptKey).tasks.push(task);
    }

    // Status priority for deduplication (higher index = higher priority)
    const statusPriority: Record<string, number> = {
      PENDING: 0, ASSIGNED: 1, IN_PROGRESS: 2, REVISION: 3, REVIEW: 4, APPROVED: 5, COMPLETED: 6
    };

    const result = [];
    for (const item of grouped.values()) {
      // Deduplicate tasks by title — keep the one with the best status
      // (handles the case where SMM + GD service both created "Design Post N")
      const deduped = new Map<string, any>();
      for (const t of item.tasks) {
        const existing = deduped.get(t.title);
        if (!existing) {
          deduped.set(t.title, t);
        } else {
          const existingPriority = statusPriority[existing.status] ?? 0;
          const newPriority = statusPriority[t.status] ?? 0;
          if (newPriority > existingPriority) {
            deduped.set(t.title, t);
          }
        }
      }
      item.tasks = Array.from(deduped.values());

      const total = item.tasks.length;
      const completed = item.tasks.filter((t: any) => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
      const progress = total ? Math.round((completed / total) * 100) : 0;
      const status = progress === 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Pending';
      const statusClass = progress === 100 ? 'success' : progress > 0 ? 'warning' : 'danger';

      const assigneeTask = item.tasks.find((t: any) => t.assignedToId);
      const assigneeId = assigneeTask ? assigneeTask.assignedToId : item.assignedToId;
      const assigneeName = assigneeId ? this.getEmployeeName(assigneeId) : '—';

      // Dept name: try lookup first, fallback to serviceName from a task
      let departmentName = this.getDepartmentName(item.departmentId);
      if (departmentName === '—') {
        const taskWithService = item.tasks.find((t: any) => t.serviceName);
        departmentName = taskWithService?.serviceName || item.name || '—';
      }

      result.push({
        ...item,
        total,
        completed,
        pending: total - completed,
        progress,
        status,
        statusClass,
        assigneeName,
        isUnassigned: !assigneeId,
        departmentName
      });
    }

    return result;
  }
}
