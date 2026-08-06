import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../../core/services/client.service';
import { LeadService } from '../../core/services/lead.service';
import { ServiceCatalogService } from '../../core/services/service-catalog.service';
import { WorkflowService } from '../../core/services/workflow.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ModalComponent } from '../../shared/components/modal/modal';

@Component({
  selector: 'app-clients',
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './clients.html',
  styleUrl: './clients.css'
})
export class ClientsComponent implements OnInit {
  private readonly clientService = inject(ClientService);
  private readonly leadService = inject(LeadService);
  private readonly catalogService = inject(ServiceCatalogService);
  private readonly workflowService = inject(WorkflowService);
  private readonly toast = inject(ToastService);
  readonly authService = inject(AuthService);

  // Signals
  clients = signal<any[]>([]);
  services = signal<any[]>([]);
  leads = signal<any[]>([]);
  loadingClients = signal(false);
  loadingServices = signal(false);
  submitting = signal(false);

  // Selected client for details
  selectedClient = signal<any>(null);

  maskPhone(phone: string | null | undefined): string {
    if (!phone) return 'Not Provided';
    if (this.authService.isAdminUser()) return phone;
    const trimmed = phone.trim();
    if (trimmed.length <= 4) return trimmed;
    const first2 = trimmed.substring(0, 2);
    const last2 = trimmed.substring(trimmed.length - 2);
    const masked = '*'.repeat(Math.max(4, trimmed.length - 4));
    return `${first2}${masked}${last2}`;
  }

  maskEmail(email: string | null | undefined): string {
    if (!email) return 'N/A';
    if (this.authService.isAdminUser()) return email;
    const parts = email.split('@');
    if (parts.length < 2) {
      if (email.length <= 4) return email;
      return `${email.substring(0, 2)}${'*'.repeat(email.length - 4)}${email.substring(email.length - 2)}`;
    }
    const [user, domain] = parts;
    const maskedUser = user.length <= 4
      ? user[0] + '*'.repeat(Math.max(1, user.length - 1))
      : `${user.substring(0, 2)}${'*'.repeat(user.length - 4)}${user.substring(user.length - 2)}`;
    return `${maskedUser}@${domain}`;
  }

  // Pause Services Modal state
  showPauseModal = false;
  pauseDaysVal = 10;
  pauseReasonVal = '';

  openPauseModal(): void {
    this.pauseDaysVal = 10;
    this.pauseReasonVal = '';
    this.showPauseModal = true;
  }

  onPauseSubmit(): void {
    const client = this.selectedClient();
    if (!client) return;

    if (!this.pauseDaysVal || this.pauseDaysVal < 1) {
      this.toast.warning('Please enter valid pause days (e.g. 10)');
      return;
    }

    this.submitting.set(true);
    this.clientService.pause(client.id, this.pauseDaysVal, this.pauseReasonVal).subscribe({
      next: (res) => {
        this.toast.success(`Services paused for ${this.pauseDaysVal} days. Billing cycle extended.`);
        this.showPauseModal = false;
        this.submitting.set(false);
        this.selectedClient.set(res.data);
        this.loadClients();
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to pause client services');
      }
    });
  }

  onResumeServices(): void {
    const client = this.selectedClient();
    if (!client) return;
    if (!confirm(`Are you sure you want to resume active services for ${client.name}?`)) return;

    this.submitting.set(true);
    this.clientService.resume(client.id).subscribe({
      next: (res) => {
        this.toast.success('Services resumed successfully!');
        this.submitting.set(false);
        this.selectedClient.set(res.data);
        this.loadClients();
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to resume client services');
      }
    });
  }

  getNextBillingDate(client: any): Date {
    if (client?.nextBillingDate) return new Date(client.nextBillingDate);
    const created = new Date(client?.createdAt || Date.now());
    return new Date(created.getTime() + 30 * 86400000);
  }

  // Create Client Form fields
  showCreateModal = false;
  newName = '';
  newEmail = '';
  newPhone = '';
  newWebsite = '';
  newAddress = '';
  newNotes = '';
  newServiceIds: string[] = [];

  // SMM Configuration fields
  smmPlatforms = { facebook: false, instagram: false, linkedin: false, twitter: false, youtube: false, pinterest: false, threads: false };
  
  selectAllPlatforms(select: boolean = true): void {
    for (const key of Object.keys(this.smmPlatforms) as (keyof typeof this.smmPlatforms)[]) {
      this.smmPlatforms[key] = select;
    }
  }

  areAllPlatformsSelected(): boolean {
    return Object.values(this.smmPlatforms).every(val => val === true);
  }

  toggleSelectAllPlatforms(): void {
    const allSelected = this.areAllPlatformsSelected();
    this.selectAllPlatforms(!allSelected);
  }

  smmStaticPosts = 0;
  smmCarouselPosts = 0;
  smmReels = 0;
  smmStories = 0;
  smmMonthlyCalendar = true;
  smmCaptionWriting = true;
  smmMonthlyReport = true;
  smmClientApproval = true;

  // Graphics Design Configuration fields
  graphicsImportSmm = true;
  graphicsStaticPosts = 0;
  graphicsCarouselPosts = 0;
  graphicsStories = 0;
  graphicsBanners = 0;
  graphicsBrochures = 0;
  graphicsFlyers = 0;
  graphicsLogos = 0;
  graphicsOtherCreatives = 0;

  // Photo & Video Configuration fields
  photoSessions = 0;
  videoSessions = 0;

  // Import from Lead modal
  showImportModal = false;
  importLeadId = '';
  importServiceIds: string[] = [];
  importWebsite = '';
  importAddress = '';

  // Computed metrics
  metrics = computed(() => {
    const allClients = this.clients();
    const total = allClients.length;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentConversions = allClients.filter((c: any) => new Date(c.createdAt) >= sevenDaysAgo).length;
    return { total, recentConversions };
  });

  ngOnInit(): void {
    this.loadClients();
    this.loadServices();
    this.loadLeads();
  }

  loadClients(): void {
    this.loadingClients.set(true);
    this.clientService.all().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.clients.set(res.data);
          const currentSelected = this.selectedClient();
          if (currentSelected) {
            const updated = res.data.find((c: any) => c.id === currentSelected.id);
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

  loadServices(): void {
    this.loadingServices.set(true);
    this.catalogService.all().subscribe({
      next: (res) => {
        if (res.success) this.services.set(res.data);
        this.loadingServices.set(false);
      },
      error: () => {
        this.loadingServices.set(false);
        this.toast.error('Failed to load services. Make sure services are configured in Settings.');
      }
    });
  }

  loadLeads(): void {
    this.leadService.all().subscribe({
      next: (res) => { if (res.success && Array.isArray(res.data)) this.leads.set(res.data); },
      error: () => {}
    });
  }

  selectClient(client: any): void {
    this.selectedClient.set(client);
  }

  // ── Service multi-select helpers ────────────────────────────────
  isServiceSelected(serviceId: string, list: string[]): boolean {
    return list.includes(serviceId);
  }

  toggleService(serviceId: string, list: string[]): string[] {
    return list.includes(serviceId) ? list.filter(id => id !== serviceId) : [...list, serviceId];
  }

  toggleNewService(serviceId: string): void {
    this.newServiceIds = this.toggleService(serviceId, this.newServiceIds);
  }

  toggleImportService(serviceId: string): void {
    this.importServiceIds = this.toggleService(serviceId, this.importServiceIds);
  }

  // ── Create client ────────────────────────────────────────────────
  onCreateClient(): void {
    if (!this.newName || !this.newEmail) {
      this.toast.warning('Name and Email are required');
      return;
    }
    this.submitting.set(true);
    const dto: any = {
      name: this.newName,
      email: this.newEmail,
      phone: this.newPhone || undefined,
      website: this.newWebsite || undefined,
      address: this.newAddress || undefined,
      notes: this.newNotes || undefined,
      services: this.newServiceIds.length > 0 ? this.newServiceIds.map(id => ({
        serviceId: id,
        configuration: this.getServiceConfig(id)
      })) : undefined
    };
    this.clientService.create(dto).subscribe({
      next: (res) => {
        this.toast.success('Client onboarded successfully!');
        this.showCreateModal = false;
        this.resetCreateForm();
        this.submitting.set(false);
        this.loadClients();
        if (res.data?.id) this.selectClient(res.data);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to create client');
      }
    });
  }

  // ── Import from lead ─────────────────────────────────────────────
  onImportFromLead(): void {
    if (!this.importLeadId) {
      this.toast.warning('Please select a lead to import');
      return;
    }
    this.submitting.set(true);
    this.clientService.importFromLead({
      leadId: this.importLeadId,
      services: this.importServiceIds.length > 0 ? this.importServiceIds.map(id => ({
        serviceId: id,
        configuration: this.getServiceConfig(id)
      })) : undefined,
      website: this.importWebsite || undefined,
      address: this.importAddress || undefined
    }).subscribe({
      next: (res) => {
        this.toast.success('Lead imported as client successfully!');
        this.showImportModal = false;
        this.resetImportForm();
        this.submitting.set(false);
        this.loadClients();
        if (res.data?.id) this.selectClient(res.data);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toast.error(err.error?.message || 'Failed to import lead');
      }
    });
  }

  // ── Delete ───────────────────────────────────────────────────────
  deleteClient(id: string): void {
    if (!confirm('Are you sure you want to delete this client?')) return;
    this.clientService.delete(id).subscribe({
      next: () => {
        this.toast.success('Client deleted successfully');
        this.selectedClient.set(null);
        this.loadClients();
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to delete client')
    });
  }

  resetCreateForm(): void {
    this.newName = '';
    this.newEmail = '';
    this.newPhone = '';
    this.newWebsite = '';
    this.newAddress = '';
    this.newNotes = '';
    this.newServiceIds = [];
    this.resetSmmConfig();
    this.resetPhotoVideoConfig();
  }

  resetImportForm(): void {
    this.importLeadId = '';
    this.importServiceIds = [];
    this.importWebsite = '';
    this.importAddress = '';
    this.resetSmmConfig();
    this.resetPhotoVideoConfig();
  }

  resetSmmConfig(): void {
    this.smmPlatforms = { facebook: false, instagram: false, linkedin: false, twitter: false, youtube: false, pinterest: false, threads: false };
    this.smmStaticPosts = 0;
    this.smmCarouselPosts = 0;
    this.smmReels = 0;
    this.smmStories = 0;
    this.smmMonthlyCalendar = true;
    this.smmCaptionWriting = true;
    this.smmMonthlyReport = true;
    this.smmClientApproval = true;
  }

  resetPhotoVideoConfig(): void {
    this.photoSessions = 0;
    this.videoSessions = 0;
  }

  getServiceNames(client: any): string {
    if (!client?.services || client.services.length === 0) return 'No services';
    return client.services.map((cs: any) => cs.service?.name || '').filter(Boolean).join(', ');
  }

  getServiceConfig(serviceId: string): any {
    if (this.isSmmService(serviceId)) return this.getSmmConfig();
    if (this.isGraphicsService(serviceId)) return this.getGraphicsConfig();
    if (this.isPhotoVideoService(serviceId)) return this.getPhotoVideoConfig();
    return undefined;
  }

  isSmmService(serviceId: string): boolean {
    const svc = this.services().find(s => s.id === serviceId);
    const normalized = (svc?.name || '').toLowerCase().replace(/\s+/g, '');
    return normalized.includes('socialmedia') || normalized.includes('smm') || normalized.includes('social');
  }

  isSmmSelected(serviceIds: string[]): boolean {
    return serviceIds.some(id => this.isSmmService(id));
  }

  isGraphicsService(serviceId: string): boolean {
    const svc = this.services().find(s => s.id === serviceId);
    const normalized = (svc?.name || '').toLowerCase().replace(/\s+/g, '');
    return normalized.includes('graphic') || normalized.includes('design');
  }

  isGraphicsSelected(serviceIds: string[]): boolean {
    return serviceIds.some(id => this.isGraphicsService(id));
  }

  isPhotoVideoService(serviceId: string): boolean {
    const svc = this.services().find(s => s.id === serviceId);
    const normalized = (svc?.name || '').toLowerCase().replace(/\s+/g, '');
    return normalized.includes('photo') || normalized.includes('video') || normalized.includes('shoot');
  }

  isPhotoVideoSelected(serviceIds: string[]): boolean {
    return serviceIds.some(id => this.isPhotoVideoService(id));
  }

  getPhotoVideoConfig(): any {
    return {
      photoSessions: this.photoSessions,
      videoSessions: this.videoSessions
    };
  }

  getGraphicsConfig(): any {
    const hasSmm = this.isSmmSelected(this.newServiceIds) || this.isSmmSelected(this.importServiceIds);
    if (this.graphicsImportSmm && hasSmm) {
      return {
        importFromSmm: true,
        staticPosts: this.smmStaticPosts,
        carouselPosts: this.smmCarouselPosts,
        stories: this.smmStories,
        reelCovers: this.smmReels
      };
    }
    const posts = this.graphicsStaticPosts || (this.graphicsCarouselPosts || this.graphicsStories ? 0 : 3);
    const stories = this.graphicsStories || (this.graphicsStaticPosts || this.graphicsCarouselPosts ? 0 : 1);
    return {
      importFromSmm: false,
      staticPosts: posts,
      carouselPosts: this.graphicsCarouselPosts,
      stories: stories,
      banners: this.graphicsBanners,
      brochures: this.graphicsBrochures,
      flyers: this.graphicsFlyers,
      logos: this.graphicsLogos,
      otherCreatives: this.graphicsOtherCreatives
    };
  }

  getSmmConfig(): any {
    return {
      platforms: Object.entries(this.smmPlatforms).filter(([_, v]) => v).map(([k, _]) => k),
      staticPosts: this.smmStaticPosts,
      carouselPosts: this.smmCarouselPosts,
      reels: this.smmReels,
      stories: this.smmStories,
      monthlyCalendar: this.smmMonthlyCalendar,
      captionWriting: this.smmCaptionWriting,
      monthlyReport: this.smmMonthlyReport,
      clientApproval: this.smmClientApproval
    };
  }

  generateWorkflow(clientId: string): void {
    if (!confirm('Are you sure you want to generate workflow tasks based on the client configuration?')) return;
    this.workflowService.autoGenerateClientWorkflow(clientId).subscribe({
      next: () => {
        this.toast.success('Workflow and tasks generated successfully! 🎉');
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to generate workflow');
      }
    });
  }
}
