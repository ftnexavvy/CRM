import { __decorate } from "tslib";
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal';
let DepartmentsComponent = class DepartmentsComponent {
    deptService = inject(DepartmentService);
    toast = inject(ToastService);
    authService = inject(AuthService);
    departments = signal([]);
    loading = signal(true);
    submitting = signal(false);
    // Modal Control
    showCreateModal = false;
    showEditModal = false;
    // Forms state
    deptName = '';
    deptCode = '';
    editDeptId = '';
    editDeptName = '';
    editDeptCode = '';
    editDeptActive = true;
    ngOnInit() {
        this.loadDepartments();
    }
    loadDepartments() {
        this.loading.set(true);
        this.deptService.all().subscribe({
            next: (res) => {
                if (res.success && Array.isArray(res.data)) {
                    this.departments.set(res.data);
                }
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load departments');
            }
        });
    }
    onCreateSubmit() {
        if (!this.deptName || !this.deptCode) {
            this.toast.warning('Name and Code are required');
            return;
        }
        // Code pattern match: starts with caps, alphanumeric/underscore, length 2-50
        const codePattern = /^[A-Z][A-Z0-9_]{1,49}$/;
        if (!codePattern.test(this.deptCode)) {
            this.toast.error('Department code must start with an uppercase letter, use only caps/numbers/underscores, e.g. SALES_DEPT');
            return;
        }
        this.submitting.set(true);
        this.deptService.create({ name: this.deptName, code: this.deptCode }).subscribe({
            next: () => {
                this.toast.success('Department created successfully!');
                this.showCreateModal = false;
                this.deptName = '';
                this.deptCode = '';
                this.submitting.set(false);
                this.loadDepartments();
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to create department');
            }
        });
    }
    openEditModal(dept) {
        this.editDeptId = dept.id;
        this.editDeptName = dept.name;
        this.editDeptCode = dept.code;
        this.editDeptActive = dept.isActive;
        this.showEditModal = true;
    }
    onEditSubmit() {
        if (!this.editDeptName || !this.editDeptCode) {
            this.toast.warning('Name and Code are required');
            return;
        }
        this.submitting.set(true);
        const dto = {
            name: this.editDeptName,
            code: this.editDeptCode,
            isActive: this.editDeptActive
        };
        this.deptService.update(this.editDeptId, dto).subscribe({
            next: () => {
                this.toast.success('Department updated successfully!');
                this.showEditModal = false;
                this.submitting.set(false);
                this.loadDepartments();
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to update department');
            }
        });
    }
};
DepartmentsComponent = __decorate([
    Component({
        selector: 'app-departments',
        imports: [CommonModule, FormsModule, ModalComponent],
        templateUrl: './departments.html',
        styleUrl: './departments.css'
    })
], DepartmentsComponent);
export { DepartmentsComponent };
