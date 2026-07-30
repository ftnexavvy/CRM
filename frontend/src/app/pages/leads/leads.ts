import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LeadService } from '../../core/services/lead.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { FormatEnumPipe } from '../../shared/pipes/format-enum.pipe';
import { ModalComponent } from '../../shared/components/modal/modal';

@Component({
  selector: 'app-leads',
  imports: [CommonModule, FormsModule, FormatEnumPipe, ModalComponent],
  templateUrl: './leads.html',
  styleUrl: './leads.css'
})
export class LeadsComponent implements OnInit {
  private readonly leadService = inject(LeadService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);

  // Signals
  leads = signal<any[]>([]);
  employees = signal<any[]>([]);
  selectedLead = signal<any>(null);
  
  loadingLeads = signal(false);
  submitting = signal(false);

  // Filters
  filterStatus = signal<string>('');

  // Pagination Signals
  pageSize = signal<number>(10);
  currentPage = signal<number>(1);

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
    const newLeads = allLeads.filter((l: any) => l.status === 'NEW').length;
    const wonLeads = allLeads.filter((l: any) => l.status === 'WON').length;
    
    let conversionRate = 0;
    if (total > 0) {
      conversionRate = parseFloat(((wonLeads / total) * 100).toFixed(1));
    }

    const potentialValue = allLeads
      .filter((l: any) => l.status !== 'WON' && l.status !== 'LOST')
      .reduce((sum: number, l: any) => sum + (l.value || 0), 0);

    return {
      total,
      newLeads,
      wonLeads,
      conversionRate,
      potentialValue
    };
  });

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loadLeads();
    
    // Load active employees for assignment
    this.userService.all().subscribe(res => {
      if (res.success && Array.isArray(res.data)) {
        this.employees.set(res.data.filter((e: any) => e.status === 'ACTIVE'));
      }
    });
  }

  loadLeads(): void {
    this.loadingLeads.set(true);
    this.leadService.all(this.filterStatus() || undefined).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.leads.set(res.data);
          
          // Re-select lead if one was active to keep details fresh
          const currentSelected = this.selectedLead();
          if (currentSelected) {
            const updated = res.data.find((l: any) => l.id === currentSelected.id);
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

  selectLead(lead: any): void {
    this.selectedLead.set(lead);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.loadLeads();
  }

  onPageSizeChange(): void {
    this.currentPage.set(1);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  prevPage(): void {
    this.setPage(this.currentPage() - 1);
  }

  nextPage(): void {
    this.setPage(this.currentPage() + 1);
  }

  getPageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages(); i++) {
      pages.push(i);
    }
    return pages;
  }

  onCreateLead(): void {
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

  updateStatus(status: string): void {
    const lead = this.selectedLead();
    if (!lead) return;

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

  assignLead(employeeId: string): void {
    const lead = this.selectedLead();
    if (!lead) return;

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

  convertToClient(): void {
    const lead = this.selectedLead();
    if (!lead) return;

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

  resetCreateForm(): void {
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

  getEmployeeName(id: string | null): string {
    if (!id) return 'Unassigned';
    const emp = this.employees().find((e: any) => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName || ''}`.trim() : 'Unknown Employee';
  }

  getEmployeeInitials(id: string | null): string {
    if (!id) return 'U';
    const emp = this.employees().find((e: any) => e.id === id);
    if (!emp) return 'U';
    return `${emp.firstName?.charAt(0) || ''}${emp.lastName?.charAt(0) || ''}`.toUpperCase();
  }

  canEditStatus(): boolean {
    const lead = this.selectedLead();
    if (!lead) return false;
    const isAssignee = lead.assignedToId === this.authService.currentUser()?.id;
    const role = this.authService.currentUser()?.role;
    const roleName = typeof role === 'string' ? role : role?.name || '';
    const isAdmin = ["ADMINISTRATOR", "ADMIN"].includes(roleName.toUpperCase());
    return isAssignee || isAdmin;
  }

  deleteLead(id: string): void {
    if (!confirm('Are you sure you want to delete this lead?')) return;

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
}
