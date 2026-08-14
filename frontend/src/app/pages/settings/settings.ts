import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceCatalogService } from '../../core/services/service-catalog.service';
import { DepartmentService } from '../../core/services/department.service';
import { UserService } from '../../core/services/user.service';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class SettingsComponent implements OnInit {
  private readonly catalogService = inject(ServiceCatalogService);
  private readonly departmentService = inject(DepartmentService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);

  services = signal<any[]>([]);
  departments = signal<any[]>([]);
  employees = signal<any[]>([]);
  workflowSettings = signal<any>(null);
  loading = signal(false);
  submitting = signal(false);

  showCreateModal = false;
  showEditModal = false;
  editingService: any = null;

  formName = '';
  formDescription = '';
  formDepartmentId = '';
  formOwnerId = '';
  formTaskTemplates = '';
  assignmentStrategy = 'LEAST_WORKLOAD';

  ngOnInit(): void {
    this.loadServices();
    this.loadDepartments();
    this.loadEmployees();
    this.loadWorkflowSettings();
  }

  loadServices(): void {
    this.loading.set(true);
    this.catalogService.all().subscribe({
      next: (res) => {
        if (res.success) {
          this.services.set(res.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load services');
      }
    });
  }

  loadDepartments(): void {
    this.departmentService.all().subscribe({
      next: (res) => {
        if (res.success) {
          this.departments.set(res.data);
        }
      }
    });
  }

  loadEmployees(): void {
    this.userService.all().subscribe({
      next: (res) => {
        if (res.success) {
          this.employees.set(res.data);
        }
      }
    });
  }

  loadWorkflowSettings(): void {
    this.catalogService.workflowSettings().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.workflowSettings.set(res.data);
          this.assignmentStrategy = res.data.assignmentStrategy || 'LEAST_WORKLOAD';
        }
      }
    });
  }

  updateAssignmentStrategy(): void {
    this.submitting.set(true);
    this.catalogService.updateWorkflowSettings({ assignmentStrategy: this.assignmentStrategy }).subscribe({
      next: (res) => {
        if (res.success) {
          this.workflowSettings.set(res.data);
          this.toast.success('Assignment strategy updated successfully');
        }
        this.submitting.set(false);
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error('Failed to update assignment strategy');
      }
    });
  }

  saveWorkflowSettings(): void {
    this.updateAssignmentStrategy();
  }

  openCreate(): void {
    this.openCreateModal();
  }

  openEdit(service: any): void {
    this.openEditModal(service);
  }

  onCreateService(): void {
    this.createService();
  }

  onUpdateService(): void {
    this.updateService();
  }

  getDepartmentName(deptId: string): string {
    const d = this.departments().find((x: any) => x.id === deptId);
    return d ? d.name : 'Unassigned';
  }

  getEmployeeName(empId: string): string {
    const e = this.employees().find((x: any) => x.id === empId);
    return e ? `${e.firstName || ''} ${e.lastName || ''}`.trim() : 'Unassigned';
  }

  openCreateModal(): void {
    this.formName = '';
    this.formDescription = '';
    this.formDepartmentId = '';
    this.formOwnerId = '';
    this.formTaskTemplates = '';
    this.showCreateModal = true;
  }

  openEditModal(service: any): void {
    this.editingService = service;
    this.formName = service.name;
    this.formDescription = service.description || '';
    this.formDepartmentId = service.departmentId || '';
    this.formOwnerId = service.ownerId || '';

    const templates = service.taskTemplates ? service.taskTemplates.map((t: any) => t.title).join('\n') : '';
    this.formTaskTemplates = templates;
    this.showEditModal = true;
  }

  createService(): void {
    if (!this.formName || !this.formDepartmentId) {
      this.toast.error('Name and Department are required');
      return;
    }

    const taskTemplates = this.formTaskTemplates
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(title => ({ title }));

    const payload = {
      name: this.formName,
      description: this.formDescription,
      departmentId: this.formDepartmentId,
      ownerId: this.formOwnerId || undefined,
      taskTemplates
    };

    this.submitting.set(true);
    this.catalogService.create(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Service created successfully');
          this.showCreateModal = false;
          this.loadServices();
        }
        this.submitting.set(false);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to create service');
      }
    });
  }

  updateService(): void {
    if (!this.editingService) return;

    const taskTemplates = this.formTaskTemplates
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0)
      .map(title => ({ title }));

    const payload = {
      name: this.formName,
      description: this.formDescription,
      departmentId: this.formDepartmentId,
      ownerId: this.formOwnerId || undefined,
      taskTemplates
    };

    this.submitting.set(true);
    this.catalogService.update(this.editingService.id, payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Service updated successfully');
          this.showEditModal = false;
          this.editingService = null;
          this.loadServices();
        }
        this.submitting.set(false);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to update service');
      }
    });
  }

  deleteService(serviceId: any): void {
    const id = typeof serviceId === 'string' ? serviceId : serviceId?.id;
    if (!confirm('Are you sure you want to delete this service?')) return;

    this.catalogService.delete(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Service deleted successfully');
          this.loadServices();
        }
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to delete service');
      }
    });
  }
}
