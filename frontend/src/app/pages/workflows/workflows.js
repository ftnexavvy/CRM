import { __decorate } from "tslib";
import { Component, inject, signal } from '@angular/core';
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
let WorkflowsComponent = class WorkflowsComponent {
    workflowService = inject(WorkflowService);
    departmentService = inject(DepartmentService);
    clientService = inject(ClientService);
    userService = inject(UserService);
    toast = inject(ToastService);
    route = inject(ActivatedRoute);
    router = inject(Router);
    authService = inject(AuthService);
    // Lists
    departments = signal([]);
    clients = signal([]);
    employees = signal([]);
    workflows = signal([]);
    // Selected state
    selectedDeptId = signal('');
    selectedClientId = signal('');
    selectedWorkflow = signal(null);
    timeline = signal([]);
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
    actionType = 'complete';
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
    selectedTask = signal(null);
    newComment = '';
    newAttachmentName = '';
    newAttachmentUrl = '';
    // Helpers
    loadingWorkflows = signal(false);
    loadingDetails = signal(false);
    submitting = signal(false);
    ngOnInit() {
        this.loadInitialData();
        this.route.queryParams.subscribe(params => {
            const workflowId = params['id'];
            if (workflowId) {
                this.selectWorkflow(workflowId);
            }
        });
    }
    loadInitialData() {
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
                this.employees.set(res.data.filter((e) => e.status === 'ACTIVE'));
            }
        });
        // Load clients
        this.clientService.all().subscribe(res => {
            if (res.success && Array.isArray(res.data)) {
                this.clients.set(res.data);
            }
        });
    }
    loadDepartmentWorkflows() {
        if (!this.selectedDeptId())
            return;
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
    loadClientWorkflows() {
        if (!this.selectedClientId())
            return;
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
    onDeptChange() {
        this.selectedClientId.set('');
        this.loadDepartmentWorkflows();
    }
    onClientChange() {
        this.selectedDeptId.set('');
        this.loadClientWorkflows();
    }
    selectWorkflow(id) {
        this.loadingDetails.set(true);
        this.router.navigate([], { queryParams: { id }, queryParamsHandling: 'merge' });
        // Load workflow one
        this.workflowService.one(id).subscribe({
            next: (res) => {
                if (res.success && res.data) {
                    this.selectedWorkflow.set(res.data);
                    this.loadTimeline(id);
                }
                else {
                    this.loadingDetails.set(false);
                }
            },
            error: () => {
                this.loadingDetails.set(false);
                this.toast.error('Failed to load workflow details');
            }
        });
    }
    loadTimeline(id) {
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
    onCreateWorkflow() {
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
    deleteWorkflow(id) {
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
                }
                else {
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
    openAssignModal(transfer = false) {
        this.isTransfer = transfer;
        const wf = this.selectedWorkflow();
        if (wf) {
            this.assignDeptId = wf.currentDepartmentId || '';
            // Set active assignment details if transfer
            const activeAssign = wf.assignments?.[0];
            if (activeAssign && transfer) {
                this.assignToId = activeAssign.assignedToId;
            }
            else {
                this.assignToId = '';
            }
        }
        this.assignRemarks = '';
        this.showAssignModal = true;
    }
    onAssignSubmit() {
        const wf = this.selectedWorkflow();
        if (!wf)
            return;
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
    acceptWorkflow() {
        const wf = this.selectedWorkflow();
        if (!wf)
            return;
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
    openActionModal(type) {
        this.actionType = type;
        this.actionRemarks = '';
        this.showActionModal = true;
    }
    onActionSubmit() {
        const wf = this.selectedWorkflow();
        if (!wf)
            return;
        this.submitting.set(true);
        let action$;
        if (this.actionType === 'reject') {
            action$ = this.workflowService.reject(wf.id, this.actionRemarks);
        }
        else if (this.actionType === 'complete') {
            action$ = this.workflowService.complete(wf.id, this.actionRemarks);
        }
        else {
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
    openCustomTaskModal() {
        const wf = this.selectedWorkflow();
        if (!wf)
            return;
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
    onCreateCustomTask() {
        const wf = this.selectedWorkflow();
        if (!wf)
            return;
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
    regenerateWorkflow() {
        const wf = this.selectedWorkflow();
        if (!wf || !confirm('Regenerate this workflow from the latest service templates? Custom tasks will be kept.'))
            return;
        this.submitting.set(true);
        this.workflowService.regenerate(wf.id).subscribe({
            next: () => {
                this.toast.success('Workflow regenerated from service templates');
                this.submitting.set(false);
                this.selectWorkflow(wf.id);
                if (this.selectedClientId())
                    this.loadClientWorkflows();
                else
                    this.loadDepartmentWorkflows();
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to regenerate workflow');
            }
        });
    }
    // Modal: Open Task Detail
    openTaskDetail(task) {
        this.selectedTask.set(task);
        this.newComment = '';
        this.newAttachmentName = '';
        this.newAttachmentUrl = '';
        this.showTaskDetailModal = true;
    }
    assignTask(assignedToId) {
        const task = this.selectedTask();
        if (!task)
            return;
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
    addComment() {
        const task = this.selectedTask();
        if (!task || !this.newComment)
            return;
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
    addAttachment() {
        const task = this.selectedTask();
        if (!task || !this.newAttachmentName || !this.newAttachmentUrl)
            return;
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
    refreshSelectedTask() {
        const task = this.selectedTask();
        const wf = this.selectedWorkflow();
        if (!task || !wf)
            return;
        this.workflowService.one(wf.id).subscribe(res => {
            if (res.success && res.data) {
                this.selectedWorkflow.set(res.data);
                const updatedTask = res.data.tasks?.find((t) => t.id === task.id);
                if (updatedTask) {
                    this.selectedTask.set(updatedTask);
                }
            }
        });
    }
    // Active user helper checking if they can act on workflow
    canAct() {
        const wf = this.selectedWorkflow();
        if (!wf)
            return false;
        const activeAssign = wf.assignments?.[0];
        if (!activeAssign)
            return false;
        // Check if the current assignment is assigned to logged in user and active (ASSIGNED or ACCEPTED)
        return activeAssign.assignedToId === this.authService.currentUser()?.id &&
            (activeAssign.status === 'ASSIGNED' || activeAssign.status === 'ACCEPTED');
    }
    getEmployeeName(id) {
        if (!id)
            return 'Unassigned';
        const emp = this.employees().find(e => e.id === id);
        return emp ? `${emp.firstName} ${emp.lastName || ''}` : 'Unknown Employee';
    }
    getDepartmentName(id) {
        if (!id)
            return 'No Department';
        const dept = this.departments().find(d => d.id === id);
        return dept ? dept.name : 'Unknown Department';
    }
    workflowStats() {
        const tasks = this.selectedWorkflow()?.tasks || [];
        const completed = tasks.filter((task) => task.status === 'COMPLETED' || task.status === 'APPROVED').length;
        const overdue = tasks.filter((task) => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' && task.status !== 'APPROVED').length;
        const total = tasks.length;
        return {
            total,
            completed,
            pending: Math.max(total - completed, 0),
            overdue,
            progress: total ? Math.round((completed / total) * 100) : 0,
        };
    }
    serviceSections() {
        const tasks = this.selectedWorkflow()?.tasks || [];
        const grouped = new Map();
        for (const task of tasks) {
            const key = task.serviceId || task.serviceName || 'custom';
            if (!grouped.has(key)) {
                grouped.set(key, { key, name: task.serviceName || 'Custom Tasks', departmentId: task.departmentId, tasks: [] });
            }
            grouped.get(key).tasks.push(task);
        }
        return Array.from(grouped.values());
    }
};
WorkflowsComponent = __decorate([
    Component({
        selector: 'app-workflows',
        imports: [CommonModule, FormsModule, FormatEnumPipe, ModalComponent],
        templateUrl: './workflows.html',
        styleUrl: './workflows.css'
    })
], WorkflowsComponent);
export { WorkflowsComponent };
