import { __decorate } from "tslib";
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceCatalogService } from '../../core/services/service-catalog.service';
import { DepartmentService } from '../../core/services/department.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal';
let SettingsComponent = class SettingsComponent {
    catalogService = inject(ServiceCatalogService);
    departmentService = inject(DepartmentService);
    userService = inject(UserService);
    toast = inject(ToastService);
    services = signal([]);
    departments = signal([]);
    employees = signal([]);
    workflowSettings = signal(null);
    loading = signal(false);
    submitting = signal(false);
    showCreateModal = false;
    showEditModal = false;
    editingService = null;
    formName = '';
    formDescription = '';
    formDepartmentId = '';
    formOwnerId = '';
    formTaskTemplates = '';
    assignmentStrategy = 'LEAST_WORKLOAD';
    ngOnInit() {
        this.loadServices();
        this.loadDepartments();
        this.loadEmployees();
        this.loadWorkflowSettings();
    }
    loadServices() {
        this.loading.set(true);
        this.catalogService.all().subscribe({
            next: (res) => {
                if (res.success)
                    this.services.set(res.data);
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load services');
            }
        });
    }
    loadDepartments() {
        this.departmentService.all().subscribe(res => {
            if (res.success && Array.isArray(res.data))
                this.departments.set(res.data);
        });
    }
    loadEmployees() {
        this.userService.all().subscribe(res => {
            if (res.success && Array.isArray(res.data))
                this.employees.set(res.data.filter((employee) => employee.status === 'ACTIVE'));
        });
    }
    loadWorkflowSettings() {
        this.catalogService.workflowSettings().subscribe({
            next: (res) => {
                if (res.success) {
                    this.workflowSettings.set(res.data);
                    this.assignmentStrategy = res.data.assignmentStrategy || 'LEAST_WORKLOAD';
                }
            },
            error: () => this.toast.error('Failed to load workflow settings')
        });
    }
    openCreate() {
        this.resetForm();
        this.showCreateModal = true;
    }
    openEdit(svc) {
        this.editingService = svc;
        this.formName = svc.name;
        this.formDescription = svc.description || '';
        this.formDepartmentId = svc.departmentId || '';
        this.formOwnerId = svc.ownerId || '';
        this.formTaskTemplates = Array.isArray(svc.taskTemplates) ? svc.taskTemplates.join('\n') : '';
        this.showEditModal = true;
    }
    onCreateService() {
        if (!this.formName.trim()) {
            this.toast.warning('Service name is required');
            return;
        }
        this.submitting.set(true);
        this.catalogService.create({
            name: this.formName.trim(),
            description: this.formDescription || undefined,
            departmentId: this.formDepartmentId || undefined,
            ownerId: this.formOwnerId || undefined,
            taskTemplates: this.templateLines(),
        }).subscribe({
            next: () => {
                this.toast.success('Service created!');
                this.showCreateModal = false;
                this.submitting.set(false);
                this.loadServices();
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to create service');
            }
        });
    }
    onUpdateService() {
        if (!this.formName.trim()) {
            this.toast.warning('Service name is required');
            return;
        }
        this.submitting.set(true);
        this.catalogService.update(this.editingService.id, {
            name: this.formName.trim(),
            description: this.formDescription || undefined,
            departmentId: this.formDepartmentId || undefined,
            ownerId: this.formOwnerId || undefined,
            taskTemplates: this.templateLines(),
        }).subscribe({
            next: () => {
                this.toast.success('Service updated!');
                this.showEditModal = false;
                this.submitting.set(false);
                this.loadServices();
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to update service');
            }
        });
    }
    deleteService(id) {
        if (!confirm('Delete this service? Client links will be removed.'))
            return;
        this.catalogService.delete(id).subscribe({
            next: () => {
                this.toast.success('Service deleted');
                this.loadServices();
            },
            error: (err) => this.toast.error(err.error?.message || 'Failed to delete service')
        });
    }
    resetForm() {
        this.formName = '';
        this.formDescription = '';
        this.formDepartmentId = '';
        this.formOwnerId = '';
        this.formTaskTemplates = '';
        this.editingService = null;
    }
    saveWorkflowSettings() {
        this.submitting.set(true);
        this.catalogService.updateWorkflowSettings({ assignmentStrategy: this.assignmentStrategy }).subscribe({
            next: (res) => {
                if (res.success)
                    this.workflowSettings.set(res.data);
                this.submitting.set(false);
                this.toast.success('Workflow automation settings saved');
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to save workflow settings');
            }
        });
    }
    getDepartmentName(id) {
        if (!id)
            return 'No department';
        return this.departments().find(dept => dept.id === id)?.name || 'Unknown department';
    }
    getEmployeeName(id) {
        if (!id)
            return 'No fallback owner';
        const employee = this.employees().find(emp => emp.id === id);
        return employee ? `${employee.firstName} ${employee.lastName || ''}`.trim() : 'Unknown employee';
    }
    templateLines() {
        return this.formTaskTemplates
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
    }
};
SettingsComponent = __decorate([
    Component({
        selector: 'app-settings',
        imports: [CommonModule, FormsModule, ModalComponent],
        templateUrl: './settings.html',
        styleUrl: './settings.css'
    })
], SettingsComponent);
export { SettingsComponent };
