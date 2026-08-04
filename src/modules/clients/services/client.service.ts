import { Injectable, NotFoundException } from "@nestjs/common";
import { ClientRepository } from "../repositories/client.repository";
import { CreateClientDto, ImportClientFromLeadDto, UpdateClientDto } from "../dto/client.dto";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { WorkflowAutoAssignService } from "../../workflow/services/workflow-auto-assign.service";
import { WorkflowRecalculateService } from "../../workflow/services/workflow-recalculate.service";
import { ActivityService } from "../../activity/services/activity.service";

@Injectable()
export class ClientService {
  constructor(
    private readonly clientRepo: ClientRepository,
    private readonly prisma: PrismaService,
    private readonly workflowAutoAssign: WorkflowAutoAssignService,
    private readonly workflowRecalculate: WorkflowRecalculateService,
    private readonly activityService: ActivityService
  ) {}

  async create(companyId: string, actorId: string, dto: CreateClientDto) {
    const client = await this.clientRepo.create(companyId, dto);
    if (dto.services && dto.services.length > 0) {
      try {
        await this.workflowAutoAssign.onboardClient(companyId, actorId, client.id);
      } catch (err) {
        console.error("Auto assign workflow error during client create:", err);
      }
    }
    return client;
  }

  /**
   * Import a lead and convert it into a client in one step.
   * The lead must belong to the same company.
   */
  async importFromLead(companyId: string, actorId: string, dto: ImportClientFromLeadDto) {
    const lead = await this.prisma.lead.findFirst({ where: { id: dto.leadId, companyId } });
    if (!lead) throw new NotFoundException("Lead not found in this company");

    const client = await this.clientRepo.create(companyId, {
      name: lead.name,
      email: lead.email || "no-email@placeholder.com",
      phone: lead.phone,
      notes: lead.notes,
      website: dto.website,
      address: dto.address,
      services: dto.services,
    });

    if (dto.services && dto.services.length > 0) {
      try {
        await this.workflowAutoAssign.onboardClient(companyId, actorId, client.id);
      } catch (err) {
        console.error("Auto assign workflow error during importFromLead:", err);
      }
    }

    // Delete lead since it has been imported as a client
    await this.prisma.lead.delete({
      where: { id: lead.id },
    });

    await this.activityService.log(
      companyId,
      actorId,
      "lead_imported_as_client",
      `Imported Lead '${lead.name}' as Client`
    );

    return client;
  }

  async findAll(companyId: string) {
    return this.clientRepo.findMany(companyId);
  }

  async findOne(companyId: string, id: string) {
    const client = await this.clientRepo.findById(companyId, id);
    if (!client) throw new NotFoundException("Client not found");
    return client;
  }

  async update(companyId: string, actorId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(companyId, id);
    const updatedClient = await this.clientRepo.update(companyId, id, dto);

    if (dto.services !== undefined) {
      try {
        await this.workflowRecalculate.recalculateClientWorkflow(companyId, actorId, id);
      } catch (err) {
        console.error("Workflow recalculation error during update:", err);
      }
    }

    return updatedClient;
  }

  async delete(companyId: string, id: string) {
    await this.findOne(companyId, id);
    return this.clientRepo.delete(companyId, id);
  }

  async pause(companyId: string, actorId: string, id: string, dto: { pauseDays: number; reason?: string }) {
    const client = await this.findOne(companyId, id);
    const pauseDays = Math.max(1, dto.pauseDays || 1);

    const currentBilling = client.nextBillingDate
      ? new Date(client.nextBillingDate)
      : new Date(new Date(client.createdAt).getTime() + 30 * 86400000);
    const newBilling = new Date(currentBilling.getTime() + pauseDays * 86400000);

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        status: "PAUSED",
        pausedAt: new Date(),
        pauseDays: (client.pauseDays || 0) + pauseDays,
        pauseReason: dto.reason || "Client requested service pause",
        nextBillingDate: newBilling,
      },
      include: { services: { include: { service: true } } },
    });

    const workflow = await this.prisma.workflow.findFirst({
      where: { companyId, subjectType: "CLIENT", subjectId: id },
      include: { tasks: { where: { status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] } } } },
    });

    if (workflow && workflow.tasks.length > 0) {
      for (const task of workflow.tasks) {
        if (task.dueDate) {
          const shiftedDue = new Date(new Date(task.dueDate).getTime() + pauseDays * 86400000);
          await this.prisma.task.update({
            where: { id: task.id },
            data: { dueDate: shiftedDue },
          });
        }
      }
    }

    await this.activityService.log(
      companyId,
      actorId,
      "client_services_paused",
      `Paused services for client '${client.name}' for ${pauseDays} days. Billing cycle extended to ${newBilling.toLocaleDateString()}. Reason: ${dto.reason || 'N/A'}`
    );

    return updated;
  }

  async resume(companyId: string, actorId: string, id: string) {
    const client = await this.findOne(companyId, id);
    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        status: "ACTIVE",
        pausedAt: null,
      },
      include: { services: { include: { service: true } } },
    });

    await this.activityService.log(
      companyId,
      actorId,
      "client_services_resumed",
      `Resumed active services for client '${client.name}'`
    );

    return updated;
  }
}
