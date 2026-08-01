import { Injectable, forwardRef, Inject } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { WorkflowStatus } from "@prisma/client";
import { ActivityService } from "../../activity/services/activity.service";
import { WorkflowAutoAssignService } from "./workflow-auto-assign.service";

@Injectable()
export class WorkflowRecalculateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    @Inject(forwardRef(() => WorkflowAutoAssignService))
    private readonly autoAssignService: WorkflowAutoAssignService
  ) {}

  async recalculateClientWorkflow(companyId: string, actorId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, companyId },
      include: {
        services: {
          include: { service: true }
        }
      }
    });
    if (!client) return;

    const workflow = await this.prisma.workflow.findFirst({
      where: {
        companyId,
        subjectType: "CLIENT",
        subjectId: clientId,
      },
      include: { tasks: true }
    });

    if (!workflow || workflow.status === WorkflowStatus.COMPLETED || workflow.status === WorkflowStatus.CANCELLED) {
      return; 
    }

    const campaignStartDate = workflow.startedAt || new Date();
    const campaignEndDate = new Date(campaignStartDate);
    campaignEndDate.setDate(campaignEndDate.getDate() + 30);

    const idealTasks: { title: string; dueDate?: Date; type: any; departmentName?: string; serviceId: string; serviceName: string; isLocked?: boolean; dependsOnTitle?: string }[] = [];

    for (const clientService of client.services) {
      const dynamicTasks = this.autoAssignService.resolveDynamicTasks(
        clientService.service,
        clientService.configuration,
        client.services,
        campaignStartDate,
        campaignEndDate
      );

      for (const t of dynamicTasks) {
        idealTasks.push({
          title: t.title,
          dueDate: t.dueDate,
          type: t.type,
          departmentName: t.departmentName,
          serviceId: clientService.service.id,
          serviceName: clientService.service.name,
          isLocked: t.isLocked,
          dependsOnTitle: t.dependsOnTitle
        });
      }
    }

    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;

    const existingTasks = workflow.tasks;
    
    // 1. Delete tasks that are no longer in idealTasks AND are not completed
    for (const existing of existingTasks) {
      if (existing.isCustom) continue; // Do not touch custom tasks
      const stillNeeded = idealTasks.find(t => t.title === existing.title && t.serviceId === existing.serviceId);
      
      if (!stillNeeded) {
        if (existing.status !== WorkflowStatus.COMPLETED && existing.status !== WorkflowStatus.APPROVED) {
          await this.prisma.task.delete({ where: { id: existing.id } });
          deletedCount++;
        }
      }
    }

    // 2. Update existing tasks or create new ones
    for (const ideal of idealTasks) {
      const existing = existingTasks.find(t => t.title === ideal.title && t.serviceId === ideal.serviceId);
      
      if (existing) {
        // Update dueDate if not completed
        if (existing.status !== WorkflowStatus.COMPLETED && existing.status !== WorkflowStatus.APPROVED) {
           await this.prisma.task.update({
             where: { id: existing.id },
             data: { dueDate: ideal.dueDate }
           });
           updatedCount++;
        }
      } else {
         // Create missing task
         const allDepartments = await this.prisma.department.findMany({ where: { companyId, isActive: true } });
         let departmentId = null;
         if (ideal.departmentName) {
            const target = ideal.departmentName.toLowerCase().replace(/[^a-z0-9]/g, "");
            const match = allDepartments.find(d => d.name.toLowerCase().replace(/[^a-z0-9]/g, "") === target);
            if (match) departmentId = match.id;
         }

         await this.prisma.task.create({
            data: {
              companyId,
              workflowId: workflow.id,
              createdById: actorId,
              type: ideal.type,
              serviceId: ideal.serviceId,
              serviceName: ideal.serviceName,
              title: ideal.title,
              isLocked: ideal.isLocked ?? false,
              departmentId,
              dueDate: ideal.dueDate
            }
         });
         createdCount++;
      }
    }

    // We do not run the auto-assign department owner logic here for newly created tasks 
    // to keep it simple and avoid massive re-assignments. The manager can assign them.

    if (createdCount > 0 || updatedCount > 0 || deletedCount > 0) {
      await this.activityService.log(
        companyId,
        actorId,
        "workflow_recalculated",
        `Client package updated. Tasks recalculated: ${createdCount} created, ${updatedCount} dates updated, ${deletedCount} removed.`
      );
    }
  }
}
