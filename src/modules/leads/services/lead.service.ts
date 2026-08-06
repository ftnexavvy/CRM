import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { LeadRepository } from "../repositories/lead.repository";
import { CreateLeadDto, UpdateLeadDto } from "../dto/lead.dto";
import { LeadStatus } from "@prisma/client";
import { ActivityService } from "../../activity/services/activity.service";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { NotificationService } from "../../notifications/services/notification.service";

@Injectable()
export class LeadService {
  constructor(
    private readonly leadRepo: LeadRepository,
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  async create(companyId: string, actorId: string, dto: CreateLeadDto) {
    const lead = await this.leadRepo.create(companyId, dto);
    await this.activityService.log(
      companyId,
      actorId,
      "lead_created",
      `Created Lead '${lead.name}' with status '${lead.status}'`
    );
    await this.notificationService.notifyCompany(
      companyId,
      "🎯 New Lead Added",
      `New lead '${lead.name}' has been added!`,
      "lead_created",
      lead
    );
    return lead;
  }

  async findAll(companyId: string, status?: LeadStatus, assignedToId?: string) {
    return this.leadRepo.findMany(companyId, status, assignedToId);
  }

  async findOne(companyId: string, id: string) {
    const lead = await this.leadRepo.findById(companyId, id);
    if (!lead) throw new NotFoundException("Lead not found");
    return lead;
  }

  async update(companyId: string, actorId: string, id: string, dto: UpdateLeadDto) {
    await this.findOne(companyId, id);
    const lead = await this.leadRepo.update(companyId, id, dto);
    await this.activityService.log(
      companyId,
      actorId,
      "lead_updated",
      `Updated details of Lead '${lead.name}'`
    );
    return lead;
  }

  async updateStatus(companyId: string, userId: string, roleName: string, id: string, status: LeadStatus) {
    const lead = await this.findOne(companyId, id);
    
    // Check if the user is the assignee or an Administrator
    const isAssignee = lead.assignedToId === userId;
    const isAdmin = ["Administrator", "ADMIN"].includes(roleName.toUpperCase()) || roleName === "Administrator";
    
    if (!isAssignee && !isAdmin) {
      throw new ForbiddenException("You are not authorized to update this lead's status");
    }

    const updatedLead = await this.leadRepo.update(companyId, id, { status });
    await this.activityService.log(
      companyId,
      userId,
      "lead_status_updated",
      `Changed status of Lead '${lead.name}' from '${lead.status}' to '${status}'`
    );
    return updatedLead;
  }

  async assign(companyId: string, actorId: string, id: string, assignedToId: string | null) {
    const lead = await this.findOne(companyId, id);
    
    let assigneeName = "Unassigned";
    if (assignedToId) {
      const emp = await this.prisma.user.findUnique({ where: { id: assignedToId } });
      if (emp) assigneeName = `${emp.firstName} ${emp.lastName || ""}`.trim();
    }

    const updatedLead = await this.leadRepo.update(companyId, id, { assignedToId });
    await this.activityService.log(
      companyId,
      actorId,
      "lead_assigned",
      `Assigned Lead '${lead.name}' to '${assigneeName}'`
    );

    if (assignedToId) {
      await this.notificationService.notify(
        companyId,
        assignedToId,
        "New Lead Assigned",
        `You have been assigned the lead '${lead.name}'`
      );
    }

    return updatedLead;
  }

  async convert(companyId: string, actorId: string, id: string) {
    const lead = await this.findOne(companyId, id);
    
    if (lead.status !== LeadStatus.WON) {
      throw new BadRequestException("Only leads with status 'WON' can be converted to clients");
    }

    const client = await this.leadRepo.transaction(async (tx) => {
      // Create Client record using Lead details
      const c = await tx.client.create({
        data: {
          companyId,
          name: lead.name,
          email: lead.email || "no-email@example.com",
          phone: lead.phone,
          notes: lead.notes,
        },
      });

      // Delete Lead record since it has been converted
      await tx.lead.delete({
        where: { id },
      });

      return c;
    });

    await this.activityService.log(
      companyId,
      actorId,
      "lead_converted",
      `Converted Lead '${lead.name}' into Client account`
    );

    return client;
  }

  async delete(companyId: string, actorId: string, id: string) {
    const lead = await this.findOne(companyId, id);
    await this.leadRepo.delete(companyId, id);
    await this.activityService.log(
      companyId,
      actorId,
      "lead_deleted",
      `Deleted Lead '${lead.name}'`
    );
  }

  async importContacts(companyId: string, actorId: string, contacts: Array<{ name: string; phone?: string; email?: string }>) {
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return { importedCount: 0, message: "No contacts provided for import" };
    }

    // Fetch existing phones in this company to skip duplicates
    const existingLeads = await this.prisma.lead.findMany({
      where: { companyId },
      select: { phone: true, email: true },
    });

    const existingPhones = new Set(existingLeads.map((l) => l.phone).filter(Boolean));

    const newLeadsData = contacts
      .filter((c) => c && c.name && c.name.trim().length > 0)
      .map((c) => {
        const cleanPhone = c.phone ? c.phone.trim() : undefined;
        if (cleanPhone && existingPhones.has(cleanPhone)) {
          return null; // skip duplicate phone
        }
        if (cleanPhone) existingPhones.add(cleanPhone);
        return {
          companyId,
          name: c.name.trim(),
          phone: cleanPhone || null,
          email: c.email ? c.email.trim() : null,
          source: "Mobile Phone Contact Sync",
          notes: "Imported via Mobile Phone Contacts Sync",
        };
      })
      .filter(Boolean) as any[];

    if (newLeadsData.length === 0) {
      return { importedCount: 0, message: "All contacts already exist in CRM" };
    }

    await this.prisma.lead.createMany({
      data: newLeadsData,
    });

    await this.activityService.log(
      companyId,
      actorId,
      "contacts_imported",
      `Synced ${newLeadsData.length} phone contacts into CRM Leads`
    );

    return {
      importedCount: newLeadsData.length,
      message: `Successfully imported ${newLeadsData.length} phone contacts`,
    };
  }
}

