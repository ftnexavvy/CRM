import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RoleService } from '../../core/services/role.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal';

@Component({
  selector: 'app-roles',
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './roles.html',
  styleUrl: './roles.css'
})
export class RolesComponent implements OnInit {
  private readonly roleService = inject(RoleService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);

  roles = signal<any[]>([]);
  allPermissions = signal<any[]>([]);
  selectedRole = signal<any>(null);
  selectedPermissions = signal<string[]>([]); // Array of permission IDs that are active for the selected role

  loading = signal(true);
  submitting = signal(false);

  // Modal Control
  showCreateModal = false;
  
  // Create Form State
  roleName = '';
  roleDesc = '';

  ngOnInit(): void {
    this.loadRolesAndPermissions();
  }

  loadRolesAndPermissions(): void {
    this.loading.set(true);
    
    // Load global permission catalog
    this.roleService.allPermissions().subscribe(permRes => {
      if (permRes.success && Array.isArray(permRes.data)) {
        this.allPermissions.set(permRes.data);
      }

      // Load company roles
      this.roleService.all().subscribe({
        next: (roleRes) => {
          if (roleRes.success && Array.isArray(roleRes.data)) {
            this.roles.set(roleRes.data);
            if (roleRes.data.length > 0) {
              this.selectRole(roleRes.data[0]);
            }
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Failed to load roles list');
        }
      });
    });
  }

  selectRole(role: any): void {
    this.selectedRole.set(role);
    this.loading.set(true);
    
    // Load permissions for selected role
    this.roleService.permissionsFor(role.id).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          // Map array of permissions to their permission ID
          const activeIds = res.data.map((rp: any) => rp.permissionId);
          this.selectedPermissions.set(activeIds);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load role permissions');
      }
    });
  }

  isPermissionChecked(permissionId: string): boolean {
    return this.selectedPermissions().includes(permissionId);
  }

  togglePermission(permissionId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectedPermissions.update(current => {
      if (checked) {
        return [...current, permissionId];
      } else {
        return current.filter(id => id !== permissionId);
      }
    });
  }

  onSavePermissions(): void {
    const role = this.selectedRole();
    if (!role) return;

    this.submitting.set(true);
    this.roleService.setPermissions(role.id, this.selectedPermissions()).subscribe({
      next: () => {
        this.toast.success('Role permissions updated successfully!');
        this.submitting.set(false);
        // Refresh session profile if editing active user's role
        if (this.authService.currentUser()?.role === role.name) {
          this.authService.loadProfile().subscribe();
        }
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to update permissions');
      }
    });
  }

  onCreateSubmit(): void {
    if (!this.roleName) {
      this.toast.warning('Role name is required');
      return;
    }

    this.submitting.set(true);
    this.roleService.create({ name: this.roleName, description: this.roleDesc }).subscribe({
      next: () => {
        this.toast.success('Role created successfully!');
        this.showCreateModal = false;
        this.roleName = '';
        this.roleDesc = '';
        this.submitting.set(false);
        this.loadRolesAndPermissions();
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to create role');
      }
    });
  }

  deleteRole(role: any): void {
    if (role.isSystemRole) {
      this.toast.warning('System roles cannot be deleted');
      return;
    }

    if (confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      this.roleService.delete(role.id).subscribe({
        next: () => {
          this.toast.success('Role deleted successfully');
          this.loadRolesAndPermissions();
        },
        error: (err) => {
          this.toast.error(err.error?.message || 'Failed to delete role');
        }
      });
    }
  }

  // Helper grouping permissions by Module
  getModuleGroupedPermissions(): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    this.allPermissions().forEach(p => {
      const mod = p.module || 'General';
      if (!groups[mod]) {
        groups[mod] = [];
      }
      groups[mod].push(p);
    });
    return groups;
  }
}
