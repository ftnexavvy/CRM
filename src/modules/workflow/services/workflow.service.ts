import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AssignmentStatus, WorkflowEventType, WorkflowStatus } from "@prisma/client";
import { AssignWorkflowDto, CreateWorkflowDto, GenerateTasksDto, WorkflowRemarksDto } from "../dto/workflow.dto";
import { WorkflowRepository } from "../repositories/workflow.repository";
import { ActivityService } from "../../activity/services/activity.service";
import { NotificationService } from "../../notifications/services/notification.service";

@Injectable()
export class WorkflowService {
  constructor(
    private readonly workflows: WorkflowRepository,
    private readonly activityService: ActivityService,
    private readonly notificationService: NotificationService
  ) {}

  async create(companyId: string, actorId: string, dto: CreateWorkflowDto) {
    return this.workflows.transaction(async (tx) => {
      const duplicate = await tx.workflow.findFirst({ where: { companyId, subjectType: dto.subjectType, subjectId: dto.subjectId } });
      if (duplicate) throw new ConflictException("A workflow already exists for this record");
      const workflow = await tx.workflow.create({ data: { ...dto, companyId, createdById: actorId } });
      await this.history(tx, workflow.id, companyId, actorId, WorkflowEventType.CREATED, null, WorkflowStatus.PENDING);
      
      await this.activityService.log(
        companyId,
        actorId,
        "workflow_created",
        `Started workflow '${workflow.title}' for subject '${workflow.subjectType}'`
      );

      return workflow;
    });
  }

  async findOne(companyId: string, id: string) { 
    const workflow = await this.workflows.findById(companyId, id); 
    if (!workflow) throw new NotFoundException("Workflow not found"); 
    return workflow; 
  }

  timeline(companyId: string, id: string) { return this.workflows.timeline(companyId, id); }
  queue(companyId: string, actorId: string) { return this.workflows.employeeQueue(companyId, actorId); }
  departmentQueue(companyId: string, departmentId: string) { return this.workflows.departmentQueue(companyId, departmentId); }
  dashboard(companyId: string) { return this.workflows.dashboard(companyId); }
  findBySubject(companyId: string, subjectType: string, subjectId: string) { return this.workflows.findBySubject(companyId, subjectType, subjectId); }

  async delete(companyId: string, actorId: string, id: string) {
    const workflow = await this.findOne(companyId, id);
    await this.workflows.delete(companyId, id);
    await this.activityService.log(
      companyId,
      actorId,
      "workflow_deleted",
      `Deleted workflow '${workflow.title}' for subject '${workflow.subjectType}'`
    );
    return true;
  }

  async assign(companyId: string, actorId: string, workflowId: string, dto: AssignWorkflowDto, transfer = false) {
    return this.workflows.transaction(async (tx) => {
      const workflow = await this.required(tx, companyId, workflowId);
      await this.validAssignee(tx, companyId, dto.assignedToId, dto.departmentId);
      if ([WorkflowStatus.COMPLETED, WorkflowStatus.CANCELLED].includes(workflow.status)) throw new BadRequestException("Closed workflows cannot be assigned");
      const active = await tx.workflowAssignment.findFirst({ where: { workflowId, status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED] } }, orderBy: { assignedAt: "desc" } });
      if (active) {
        if (!transfer) throw new ConflictException("Workflow already has an active assignment; use transfer");
        await tx.workflowAssignment.update({ where: { id: active.id }, data: { status: AssignmentStatus.TRANSFERRED, closedAt: new Date() } });
      }
      const assignment = await tx.workflowAssignment.create({ data: { workflowId, companyId, departmentId: dto.departmentId, assignedById: actorId, assignedToId: dto.assignedToId, remarks: dto.remarks } });
      await tx.workflow.update({ where: { id: workflowId }, data: { status: WorkflowStatus.ASSIGNED, currentDepartmentId: dto.departmentId, version: { increment: 1 } } });
      await this.history(tx, workflowId, companyId, actorId, transfer ? WorkflowEventType.TRANSFERRED : WorkflowEventType.ASSIGNED, workflow.status, WorkflowStatus.ASSIGNED, active?.assignedToId, dto.assignedToId, dto.departmentId, dto.remarks);
      
      const assigneeUser = await tx.user.findUnique({ where: { id: dto.assignedToId } });
      const assigneeName = assigneeUser ? `${assigneeUser.firstName} ${assigneeUser.lastName || ""}`.trim() : "Employee";
      await this.activityService.log(
        companyId,
        actorId,
        transfer ? "workflow_transferred" : "workflow_assigned",
        `${transfer ? "Transferred" : "Assigned"} workflow '${workflow.title}' to '${assigneeName}'`
      );

      if (dto.assignedToId) {
        await this.notificationService.notify(
          companyId,
          dto.assignedToId,
          "New Workflow Assigned",
          `You have been assigned the workflow '${workflow.title}'`
        );

        // Cascade assignment to uncompleted tasks
        await tx.task.updateMany({
          where: {
            workflowId,
            status: { in: [WorkflowStatus.PENDING, WorkflowStatus.ASSIGNED, WorkflowStatus.IN_PROGRESS, WorkflowStatus.REVIEW, WorkflowStatus.REVISION] },
          },
          data: {
            assignedToId: dto.assignedToId,
            status: WorkflowStatus.ASSIGNED,
          },
        });
      }

      return assignment;
    });
  }

  async accept(companyId: string, actorId: string, workflowId: string) { return this.transition(companyId, actorId, workflowId, "accept"); }
  async reject(companyId: string, actorId: string, workflowId: string, dto: WorkflowRemarksDto) { return this.transition(companyId, actorId, workflowId, "reject", dto.remarks); }
  async complete(companyId: string, actorId: string, workflowId: string, dto: WorkflowRemarksDto) { return this.transition(companyId, actorId, workflowId, "complete", dto.remarks); }

  async approve(companyId: string, actorId: string, workflowId: string, dto: WorkflowRemarksDto) {
    return this.workflows.transaction(async (tx) => {
      const workflow = await this.required(tx, companyId, workflowId);
      if (![WorkflowStatus.REVIEW, WorkflowStatus.IN_PROGRESS].includes(workflow.status)) throw new BadRequestException("Only work in review can be approved");
      await tx.workflow.update({ where: { id: workflowId }, data: { status: WorkflowStatus.APPROVED, version: { increment: 1 } } });
      await this.history(tx, workflowId, companyId, actorId, WorkflowEventType.APPROVED, workflow.status, WorkflowStatus.APPROVED, undefined, undefined, workflow.currentDepartmentId, dto.remarks);
      
      await this.activityService.log(
        companyId,
        actorId,
        "workflow_approved",
        `Approved workflow '${workflow.title}'`
      );

      return this.required(tx, companyId, workflowId);
    });
  }

  async generateTasks(companyId: string, actorId: string, workflowId: string, dto: GenerateTasksDto) {
    return this.workflows.transaction(async (tx) => {
      const workflow = await this.required(tx, companyId, workflowId);
      const data = dto.items.flatMap((item) => Array.from({ length: item.quantity }, (_, index) => ({ workflowId, companyId, createdById: actorId, type: item.type, title: `${item.titlePrefix} ${index + 1}` })));
      await tx.task.createMany({ data });
      await this.history(tx, workflowId, companyId, actorId, WorkflowEventType.TASKS_GENERATED, undefined, undefined, undefined, undefined, undefined, undefined, { count: data.length, items: dto.items });
      
      await this.activityService.log(
        companyId,
        actorId,
        "tasks_generated",
        `Generated ${data.length} tasks for workflow '${workflow.title}'`
      );

      return { created: data.length };
    });
  }

  private async transition(companyId: string, actorId: string, workflowId: string, action: "accept" | "reject" | "complete", remarks?: string) {
    return this.workflows.transaction(async (tx) => {
      const workflow = await this.required(tx, companyId, workflowId);
      const active = await tx.workflowAssignment.findFirst({ where: { workflowId, assignedToId: actorId, status: { in: [AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED] } } });
      if (!active) throw new BadRequestException("You do not have an active assignment for this workflow");
      const map = { accept: [AssignmentStatus.ACCEPTED, WorkflowStatus.IN_PROGRESS, WorkflowEventType.ACCEPTED], reject: [AssignmentStatus.REJECTED, WorkflowStatus.REVISION, WorkflowEventType.REJECTED], complete: [AssignmentStatus.COMPLETED, WorkflowStatus.REVIEW, WorkflowEventType.COMPLETED] } as const;
      const [assignmentStatus, workflowStatus, eventType] = map[action];
      await tx.workflowAssignment.update({ where: { id: active.id }, data: { status: assignmentStatus, ...(action === "accept" ? { acceptedAt: new Date() } : { completedAt: new Date(), closedAt: new Date() }) } });
      await tx.workflow.update({ where: { id: workflowId }, data: { status: workflowStatus, version: { increment: 1 } } });
      await this.history(tx, workflowId, companyId, actorId, eventType, workflow.status, workflowStatus, actorId, undefined, active.departmentId, remarks);
      
      const detailsMap = {
        accept: `Accepted workflow '${workflow.title}'`,
        reject: `Rejected workflow '${workflow.title}' for revision`,
        complete: `Completed work on workflow '${workflow.title}' (Submitted for Review)`
      };
      await this.activityService.log(
        companyId,
        actorId,
        `workflow_${action}ed`,
        detailsMap[action]
      );

      return this.required(tx, companyId, workflowId);
    });
  }

  private async required(tx: any, companyId: string, id: string) { const workflow = await tx.workflow.findFirst({ where: { id, companyId } }); if (!workflow) throw new NotFoundException("Workflow not found"); return workflow; }
  private async validAssignee(tx: any, companyId: string, userId: string, departmentId: string) {
    const [user, department] = await Promise.all([tx.user.findFirst({ where: { id: userId, companyId, status: "ACTIVE" } }), tx.department.findFirst({ where: { id: departmentId, companyId, isActive: true } })]);
    if (!user) throw new NotFoundException("Active assignee not found in this company"); if (!department) throw new NotFoundException("Active department not found in this company");
  }
  private history(tx: any, workflowId: string, companyId: string, actorId: string, eventType: WorkflowEventType, fromStatus?: WorkflowStatus | null, toStatus?: WorkflowStatus | null, fromUserId?: string, toUserId?: string, departmentId?: string, remarks?: string, metadata?: object) {
    return tx.workflowHistory.create({ data: { workflowId, companyId, actorId, eventType, fromStatus: fromStatus ?? undefined, toStatus: toStatus ?? undefined, fromUserId, toUserId, departmentId, remarks, metadata } });
  }
}
