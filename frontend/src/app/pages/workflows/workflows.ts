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
          this.workflows.set(res.data);
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

  openCustomTaskModal(): void {
    const wf = this.selectedWorkflow();
    if (!wf) return;

    this.customTaskTitle = '';
    this.customTaskType = 'GENERIC';
    this.customTaskDepartmentId = wf.currentDepartmentId || this.departments()[0]?.id || '';
    this.customTaskAssignedToId = '';
    this.customTaskPriority = 'MEDIUM';
    this.customTaskDueDate = '';
    this.customTaskDescription = '';
    this.customTaskAttachmentName = '';
    this.customTaskAttachmentUrl = '';
    this.showCustomTaskModal = true;
  }

  onCreateCustomTask(): void {
    const wf = this.selectedWorkflow();
    if (!wf) return;

    if (!this.customTaskTitle.trim() || !this.customTaskDepartmentId) {
      this.toast.warning('Task title and department are required');
      return;
    }

    this.submitting.set(true);
    const dto = {
      title: this.customTaskTitle.trim(),
      type: this.customTaskType,
      departmentId: this.customTaskDepartmentId,
      assignedToId: this.customTaskAssignedToId || undefined,
      priority: this.customTaskPriority,
      dueDate: this.customTaskDueDate || undefined,
      description: this.customTaskDescription || undefined,
      serviceName: 'Custom Tasks',
      attachments: this.customTaskAttachmentName && this.customTaskAttachmentUrl
        ? [{ fileName: this.customTaskAttachmentName, fileUrl: this.customTaskAttachmentUrl }]
        : undefined
    };

    this.workflowService.createCustomTask(wf.id, dto).subscribe({
      next: () => {
        this.toast.success('Custom task added');
        this.showCustomTaskModal = false;
        this.submitting.set(false);
        this.selectWorkflow(wf.id);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to add custom task');
      }
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

  canAct(): boolean {
    const wf = this.selectedWorkflow();
    if (!wf) return false;
    const currentUserId = this.authService.currentUser()?.id;
    if (!currentUserId) return false;

    const activeAssign = wf.assignments?.[0];
    const isWfAssignee = activeAssign?.assignedToId === currentUserId && 
                         (activeAssign.status === 'ASSIGNED' || activeAssign.status === 'ACCEPTED');
    const hasTaskAssignee = wf.tasks?.some((t: any) => t.assignedToId === currentUserId);

    return isWfAssignee || hasTaskAssignee;
  }

  updateTaskStatusFromModal(status: string): void {
    const task = this.selectedTask();
    if (!task) return;
    if (task.isLocked && status === 'COMPLETED') {
      this.toast.warning('🔒 This task is locked! Complete prerequisite tasks first.');
      return;
    }

    this.workflowService.updateTaskStatus(task.id, status).subscribe({
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

  getEmployeeName(id: string | null): string {
    if (!id) return 'No employee available in this department';
    const emp = this.employees().find(e => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName || ''}` : 'No employee available in this department';
  }

  getDepartmentName(id: string | null): string {
    if (!id) return 'No Department';
    const dept = this.departments().find(d => d.id === id);
    return dept ? dept.name : 'Unknown Department';
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
    if (task.isLocked) {
      this.toast.warning('🔒 This task is locked! Complete prerequisite tasks first (e.g. Client Approval).');
      return;
    }
    const newStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    this.workflowService.updateTaskStatus(task.id, newStatus).subscribe({
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
      // Determine department grouping key based on task.departmentId or task.type/title
      let deptKey = task.departmentId;
      let cardType = 'custom';
      let cardName = task.serviceName || 'Tasks';

      const taskType = (task.type || '').toUpperCase();
      const titleLower = (task.title || '').toLowerCase();
      const serviceLower = (task.serviceName || '').toLowerCase();

      if (taskType === 'GRAPHIC' || titleLower.includes('design post') || titleLower.includes('story') || titleLower.includes('carousel')) {
        deptKey = task.departmentId || 'dept_graphics';
        cardType = 'graphics';
        cardName = 'Graphics Design Deliverables';
      } else if (taskType === 'REEL' || taskType === 'VIDEO' || titleLower.includes('reel') || titleLower.includes('video')) {
        deptKey = task.departmentId || 'dept_video';
        cardType = 'video';
        cardName = 'Video Editing & Reels Deliverables';
      } else if (taskType === 'CONTENT' || serviceLower.includes('social') || titleLower.includes('strategy') || titleLower.includes('calendar') || titleLower.includes('scheduling') || titleLower.includes('publishing')) {
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

    const result = [];
    for (const item of grouped.values()) {
      const total = item.tasks.length;
      const completed = item.tasks.filter((t: any) => t.status === 'COMPLETED' || t.status === 'APPROVED').length;
      const progress = total ? Math.round((completed / total) * 100) : 0;
      const status = progress === 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Pending';
      const statusClass = progress === 100 ? 'success' : progress > 0 ? 'warning' : 'danger';

      const assigneeTask = item.tasks.find((t: any) => t.assignedToId);
      const assigneeId = assigneeTask ? assigneeTask.assignedToId : item.assignedToId;
      const assigneeName = assigneeId ? this.getEmployeeName(assigneeId) : 'No employee available in this department';

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
        departmentName: this.getDepartmentName(item.departmentId)
      });
    }

    return result;
  }
}
