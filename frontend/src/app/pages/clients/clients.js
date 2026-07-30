import { __decorate } from "tslib";
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../core/services/client.service';
import { LeadService } from '../../core/services/lead.service';
import { ServiceCatalogService } from '../../core/services/service-catalog.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal';
let ClientsComponent = class ClientsComponent {
    clientService = inject(ClientService);
    leadService = inject(LeadService);
    catalogService = inject(ServiceCatalogService);
    toast = inject(ToastService);
    authService = inject(AuthService);
    // Signals
    clients = signal([]);
    services = signal([]);
    leads = signal([]);
    loadingClients = signal(false);
    loadingServices = signal(false);
    submitting = signal(false);
    // Selected client for details
    selectedClient = signal(null);
    // Create Client Form fields
    showCreateModal = false;
    newName = '';
    newEmail = '';
    newPhone = '';
    newWebsite = '';
    newAddress = '';
    newNotes = '';
    newServiceIds = [];
    // Import from Lead modal
    showImportModal = false;
    importLeadId = '';
    importServiceIds = [];
    importWebsite = '';
    importAddress = '';
    // Computed metrics
    metrics = computed(() => {
        const allClients = this.clients();
        const total = allClients.length;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentConversions = allClients.filter((c) => new Date(c.createdAt) >= sevenDaysAgo).length;
        return { total, recentConversions };
    });
    ngOnInit() {
        this.loadClients();
        this.loadServices();
        this.loadLeads();
    }
    loadClients() {
        this.loadingClients.set(true);
        this.clientService.all().subscribe({
            next: (res) => {
                if (res.success && Array.isArray(res.data)) {
                    this.clients.set(res.data);
                    const currentSelected = this.selectedClient();
                    if (currentSelected) {
                        const updated = res.data.find((c) => c.id === currentSelected.id);
                        this.selectedClient.set(updated || null);
                    }
                }
                this.loadingClients.set(false);
            },
            error: () => {
                this.loadingClients.set(false);
                this.toast.error('Failed to load clients');
            }
        });
    }
    loadServices() {
        this.loadingServices.set(true);
        this.catalogService.all().subscribe({
            next: (res) => {
                if (res.success)
                    this.services.set(res.data);
                this.loadingServices.set(false);
            },
            error: () => {
                this.loadingServices.set(false);
                this.toast.error('Failed to load services. Make sure services are configured in Settings.');
            }
        });
    }
    loadLeads() {
        this.leadService.all().subscribe({
            next: (res) => { if (res.success && Array.isArray(res.data))
                this.leads.set(res.data); },
            error: () => { }
        });
    }
    selectClient(client) {
        this.selectedClient.set(client);
    }
    // ── Service multi-select helpers ────────────────────────────────
    isServiceSelected(serviceId, list) {
        return list.includes(serviceId);
    }
    toggleService(serviceId, list) {
        return list.includes(serviceId) ? list.filter(id => id !== serviceId) : [...list, serviceId];
    }
    toggleNewService(serviceId) {
        this.newServiceIds = this.toggleService(serviceId, this.newServiceIds);
    }
    toggleImportService(serviceId) {
        this.importServiceIds = this.toggleService(serviceId, this.importServiceIds);
    }
    // ── Create client ────────────────────────────────────────────────
    onCreateClient() {
        if (!this.newName || !this.newEmail) {
            this.toast.warning('Name and Email are required');
            return;
        }
        this.submitting.set(true);
        const dto = {
            name: this.newName,
            email: this.newEmail,
            phone: this.newPhone || undefined,
            website: this.newWebsite || undefined,
            address: this.newAddress || undefined,
            notes: this.newNotes || undefined,
            serviceIds: this.newServiceIds.length > 0 ? this.newServiceIds : undefined
        };
        this.clientService.create(dto).subscribe({
            next: (res) => {
                this.toast.success('Client onboarded successfully!');
                this.showCreateModal = false;
                this.resetCreateForm();
                this.submitting.set(false);
                this.loadClients();
                if (res.data?.id)
                    this.selectClient(res.data);
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to create client');
            }
        });
    }
    // ── Import from lead ─────────────────────────────────────────────
    onImportFromLead() {
        if (!this.importLeadId) {
            this.toast.warning('Please select a lead to import');
            return;
        }
        this.submitting.set(true);
        this.clientService.importFromLead({
            leadId: this.importLeadId,
            serviceIds: this.importServiceIds.length > 0 ? this.importServiceIds : undefined,
            website: this.importWebsite || undefined,
            address: this.importAddress || undefined
        }).subscribe({
            next: (res) => {
                this.toast.success('Lead imported as client successfully!');
                this.showImportModal = false;
                this.resetImportForm();
                this.submitting.set(false);
                this.loadClients();
                if (res.data?.id)
                    this.selectClient(res.data);
            },
            error: (err) => {
                this.submitting.set(false);
                this.toast.error(err.error?.message || 'Failed to import lead');
            }
        });
    }
    // ── Delete ───────────────────────────────────────────────────────
    deleteClient(id) {
        if (!confirm('Are you sure you want to delete this client?'))
            return;
        this.clientService.delete(id).subscribe({
            next: () => {
                this.toast.success('Client deleted successfully');
                this.selectedClient.set(null);
                this.loadClients();
            },
            error: (err) => this.toast.error(err.error?.message || 'Failed to delete client')
        });
    }
    resetCreateForm() {
        this.newName = '';
        this.newEmail = '';
        this.newPhone = '';
        this.newWebsite = '';
        this.newAddress = '';
        this.newNotes = '';
        this.newServiceIds = [];
    }
    resetImportForm() {
        this.importLeadId = '';
        this.importServiceIds = [];
        this.importWebsite = '';
        this.importAddress = '';
    }
    getServiceNames(client) {
        if (!client?.services || client.services.length === 0)
            return 'No services';
        return client.services.map((cs) => cs.service?.name || '').filter(Boolean).join(', ');
    }
};
ClientsComponent = __decorate([
    Component({
        selector: 'app-clients',
        imports: [CommonModule, FormsModule, ModalComponent],
        templateUrl: './clients.html',
        styleUrl: './clients.css'
    })
], ClientsComponent);
export { ClientsComponent };
