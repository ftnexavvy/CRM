import { __decorate } from "tslib";
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user.service';
import { RoleService } from '../../core/services/role.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal';
let UsersComponent = class UsersComponent {
    userService = inject(UserService);
    roleService = inject(RoleService);
    departmentService = inject(DepartmentService);
    toast = inject(ToastService);
    authService = inject(AuthService);
    users = signal([]);
    roles = signal([]);
    departments = signal([]);
    loading = signal(true);
    submitting = signal(false);
    // Modals state
    showCreateModal = false;
    showEditModal = false;
    showStatusModal = false;
    showPasswordModal = false;
    // Create form
    firstName = '';
    lastName = '';
    email = '';
    phone = '';
    password = '';
    roleId = '';
    designation = '';
    department = '';
    // Edit form
    selectedUserId = '';
    editFirstName = '';
    editLastName = '';
    editDesignation = '';
    editDepartment = '';
    editRoleId = '';
    // Status form
    statusUserId = '';
    newStatus = 'ACTIVE';
    // Password reset form
    passwordUserId = '';
    resetPasswordVal = '';
    ngOnInit() {
        this.loadData();
    }
    loadData() {
        this.loading.set(true);
        // Fetch departments
        this.departmentService.all().subscribe(res => {
            if (res.success && Array.isArray(res.data)) {
                this.departments.set(res.data);
            }
        });
        // Fetch roles
        this.roleService.all().subscribe(res => {
            if (res.success && Array.isArray(res.data)) {
                this.roles.set(res.data);
            }
        });
        // Fetch employees
        this.userService.all().subscribe({
            next: (res) => {
                if (res.success && Array.isArray(res.data)) {
                    this.users.set(res.data);
                }
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('Failed to load employee list');
            }
        });
    }
    onCreateSubmit() {
        if (!this.firstName || !this.email || !this.password || !this.roleId) {
            this.toast.warning('First name, email, password, and role are required');
            return;
        }
        if (this.password.length < 8) {
            this.toast.error('Password must be at least 8 characters');
            return;
        }
        this.submitting.set(true);
        const dto = {
            firstName: this.firstName,
            lastName: this.lastName || undefined,
            email: this.email,
            password: this.password,
            roleId: this.roleId,
            phone: this.phone || undefined,
            designation: this.designation || undefined,
            department: this.department || undefined
        };
        this.userService.create(dto).subscribe({
            next: () => {
                this.toast.success('Employee created successfully!');
                this.showCreateModal = false;
                this.resetCreateForm();
                this.submitting.set(false);
                this.loadData();
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to create employee');
            }
        });
    }
    openEditModal(user) {
        this.selectedUserId = user.id;
        this.editFirstName = user.firstName;
        this.editLastName = user.lastName || '';
        this.editDesignation = user.designation || '';
        this.editDepartment = user.department || '';
        this.editRoleId = user.roleId || '';
        this.showEditModal = true;
    }
    onEditSubmit() {
        this.submitting.set(true);
        const dto = {
            firstName: this.editFirstName,
            lastName: this.editLastName || undefined,
            designation: this.editDesignation || undefined,
            department: this.editDepartment || undefined,
            roleId: this.editRoleId
        };
        this.userService.update(this.selectedUserId, dto).subscribe({
            next: () => {
                this.toast.success('Employee profile updated!');
                this.showEditModal = false;
                this.submitting.set(false);
                this.loadData();
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to update profile');
            }
        });
    }
    openStatusModal(user) {
        this.statusUserId = user.id;
        this.newStatus = user.status;
        this.showStatusModal = true;
    }
    onStatusSubmit() {
        this.submitting.set(true);
        this.userService.updateStatus(this.statusUserId, this.newStatus).subscribe({
            next: () => {
                this.toast.success('Employee status updated successfully');
                this.showStatusModal = false;
                this.submitting.set(false);
                this.loadData();
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to update employee status');
            }
        });
    }
    openPasswordModal(user) {
        this.passwordUserId = user.id;
        this.resetPasswordVal = '';
        this.showPasswordModal = true;
    }
    onPasswordSubmit() {
        if (this.resetPasswordVal.length < 8) {
            this.toast.error('Password must be at least 8 characters');
            return;
        }
        this.submitting.set(true);
        this.userService.resetPassword(this.passwordUserId, this.resetPasswordVal).subscribe({
            next: () => {
                this.toast.success('Employee password reset successfully');
                this.showPasswordModal = false;
                this.submitting.set(false);
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to reset password');
            }
        });
    }
    deleteUser(id) {
        if (confirm('Are you sure you want to deactivate this employee? (This will sign them out and disable their access)')) {
            this.userService.delete(id).subscribe({
                next: () => {
                    this.toast.success('Employee deactivated successfully');
                    this.loadData();
                },
                error: (err) => {
                    this.toast.error(err.error?.message || 'Failed to deactivate employee');
                }
            });
        }
    }
    getRoleName(roleId) {
        const role = this.roles().find(r => r.id === roleId);
        return role ? role.name : 'Unknown Role';
    }
    resetCreateForm() {
        this.firstName = '';
        this.lastName = '';
        this.email = '';
        this.phone = '';
        this.password = '';
        this.roleId = '';
        this.designation = '';
        this.department = '';
    }
};
UsersComponent = __decorate([
    Component({
        selector: 'app-users',
        imports: [CommonModule, FormsModule, ModalComponent],
        templateUrl: './users.html',
        styleUrl: './users.css'
    })
], UsersComponent);
export { UsersComponent };
