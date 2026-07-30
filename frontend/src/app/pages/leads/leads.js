import { __decorate } from "tslib";
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeadService } from '../../core/services/lead.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { FormatEnumPipe } from '../../shared/pipes/format-enum.pipe';
import { ModalComponent } from '../../shared/components/modal/modal';
let LeadsComponent = class LeadsComponent {
    leadService = inject(LeadService);
    userService = inject(UserService);
    toast = inject(ToastService);
    authService = inject(AuthService);
    // Signals
    leads = signal([]);
    employees = signal([]);
    selectedLead = signal(null);
    loadingLeads = signal(false);
    submitting = signal(false);
    // Filters
    filterStatus = signal('');
    // Pagination Signals
    pageSize = signal(10);
    currentPage = signal(1);
    // Create Lead Form fields
    showCreateModal = false;
    newName = '';
    newEmail = '';
    newPhone = '';
    newSource = '';
    newValue = 0;
    newNotes = '';
    newSubtitle = '';
    newScore = 70;
    newIntent = 'High';
    newNextAction = '';
    newAiRecommendation = '';
    // Paginated leads computed signal
    paginatedLeads = computed(() => {
        const all = this.leads();
        const start = (this.currentPage() - 1) * this.pageSize();
        const end = start + this.pageSize();
        return all.slice(start, end);
    });
    totalPages = computed(() => {
        return Math.ceil(this.leads().length / this.pageSize()) || 1;
    });
    // Dashboard computed metrics
    metrics = computed(() => {
        const allLeads = this.leads();
        const total = allLeads.length;
        const newLeads = allLeads.filter((l) => l.status === 'NEW').length;
        const wonLeads = allLeads.filter((l) => l.status === 'WON').length;
        let conversionRate = 0;
        if (total > 0) {
            conversionRate = parseFloat(((wonLeads / total) * 100).toFixed(1));
        }
        const potentialValue = allLeads
            .filter((l) => l.status !== 'WON' && l.status !== 'LOST')
            .reduce((sum, l) => sum + (l.value || 0), 0);
        return {
            total,
            newLeads,
            wonLeads,
            conversionRate,
            potentialValue
        };
    });
    ngOnInit() {
        this.loadInitialData();
    }
    loadInitialData() {
        this.loadLeads();
        // Load active employees for assignment
        this.userService.all().subscribe(res => {
            if (res.success && Array.isArray(res.data)) {
                this.employees.set(res.data.filter((e) => e.status === 'ACTIVE'));
            }
        });
    }
    loadLeads() {
        this.loadingLeads.set(true);
        this.leadService.all(this.filterStatus() || undefined).subscribe({
            next: (res) => {
                if (res.success && Array.isArray(res.data)) {
                    this.leads.set(res.data);
                    // Re-select lead if one was active to keep details fresh
                    const currentSelected = this.selectedLead();
                    if (currentSelected) {
                        const updated = res.data.find((l) => l.id === currentSelected.id);
                        this.selectedLead.set(updated || null);
                    }
                }
                this.loadingLeads.set(false);
            },
            error: () => {
                this.loadingLeads.set(false);
                this.toast.error('Failed to load leads');
            }
        });
    }
    selectLead(lead) {
        this.selectedLead.set(lead);
    }
    onFilterChange() {
        this.currentPage.set(1);
        this.loadLeads();
    }
    onPageSizeChange() {
        this.currentPage.set(1);
    }
    setPage(page) {
        if (page >= 1 && page <= this.totalPages()) {
            this.currentPage.set(page);
        }
    }
    prevPage() {
        this.setPage(this.currentPage() - 1);
    }
    nextPage() {
        this.setPage(this.currentPage() + 1);
    }
    getPageNumbers() {
        const pages = [];
        for (let i = 1; i <= this.totalPages(); i++) {
            pages.push(i);
        }
        return pages;
    }
    onCreateLead() {
        if (!this.newName) {
            this.toast.warning('Name is required');
            return;
        }
        this.submitting.set(true);
        const dto = {
            name: this.newName,
            email: this.newEmail || undefined,
            phone: this.newPhone || undefined,
            source: this.newSource || undefined,
            value: this.newValue || undefined,
            notes: this.newNotes || undefined,
            subtitle: this.newSubtitle || undefined,
            score: this.newScore || undefined,
            intent: this.newIntent || undefined,
            nextAction: this.newNextAction || undefined,
            aiRecommendation: this.newAiRecommendation || undefined
        };
        this.leadService.create(dto).subscribe({
            next: (res) => {
                this.toast.success('Lead created successfully!');
                this.showCreateModal = false;
                this.resetCreateForm();
                this.submitting.set(false);
                this.loadLeads();
                if (res.data?.id) {
                    this.selectLead(res.data);
                }
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to create lead');
            }
        });
    }
    updateStatus(status) {
        const lead = this.selectedLead();
        if (!lead)
            return;
        this.leadService.updateStatus(lead.id, status).subscribe({
            next: (res) => {
                this.toast.success('Lead status updated');
                this.loadLeads();
            },
            error: (err) => {
                this.toast.error(err.error?.message || 'Failed to update status');
            }
        });
    }
    assignLead(employeeId) {
        const lead = this.selectedLead();
        if (!lead)
            return;
        const assignedToId = employeeId || null;
        this.leadService.assign(lead.id, assignedToId).subscribe({
            next: () => {
                this.toast.success('Lead assignee updated');
                this.loadLeads();
            },
            error: (err) => {
                this.toast.error(err.error?.message || 'Failed to update assignee');
            }
        });
    }
    convertToClient() {
        const lead = this.selectedLead();
        if (!lead)
            return;
        this.submitting.set(true);
        this.leadService.convert(lead.id).subscribe({
            next: () => {
                this.toast.success('Lead successfully converted into a Client!');
                this.selectedLead.set(null);
                this.submitting.set(false);
                this.loadLeads();
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to convert lead to client');
            }
        });
    }
    resetCreateForm() {
        this.newName = '';
        this.newEmail = '';
        this.newPhone = '';
        this.newSource = '';
        this.newValue = 0;
        this.newNotes = '';
        this.newSubtitle = '';
        this.newScore = 70;
        this.newIntent = 'High';
        this.newNextAction = '';
        this.newAiRecommendation = '';
    }
    getEmployeeName(id) {
        if (!id)
            return 'Unassigned';
        const emp = this.employees().find((e) => e.id === id);
        return emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'Unknown Employee';
    }
    getEmployeeInitials(id) {
        if (!id)
            return 'U';
        const emp = this.employees().find((e) => e.id === id);
        if (!emp)
            return 'U';
        return `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`.toUpperCase();
    }
    canEditStatus() {
        const lead = this.selectedLead();
        if (!lead)
            return false;
        const isAssignee = lead.assignedToId === this.authService.currentUser()?.id;
        const role = this.authService.currentUser()?.role;
        const roleName = typeof role === 'string' ? role : role?.name || '';
        const isAdmin = ["ADMINISTRATOR", "ADMIN"].includes(roleName.toUpperCase());
        return isAssignee || isAdmin;
    }
    deleteLead(id) {
        if (!confirm('Are you sure you want to delete this lead?'))
            return;
        this.leadService.delete(id).subscribe({
            next: () => {
                this.toast.success('Lead deleted successfully');
                this.selectedLead.set(null);
                this.loadLeads();
            },
            error: (err) => {
                this.toast.error(err.error?.message || 'Failed to delete lead');
            }
        });
    }
};
LeadsComponent = __decorate([
    Component({
        selector: 'app-leads',
        imports: [CommonModule, FormsModule, FormatEnumPipe, ModalComponent],
        templateUrl: './leads.html',
        styleUrl: './leads.css'
    })
], LeadsComponent);
export { LeadsComponent };
