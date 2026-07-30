import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { AssignTaskDto, CreateCustomTaskDto, CreateTaskAttachmentDto, CreateTaskCommentDto } from "../dto/workflow.dto";
import { ActivityService } from "../../activity/services/activity.service";
import { NotificationService } from "../../notifications/services/notification.service";

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly notificationService: NotificationService
  ) {}

  async createCustom(companyId: string, actorId: string, workflowId: string, dto: CreateCustomTaskDto) {
    const [workflow, department, user] = await Promise.all([
      this.prisma.workflow.findFirst({ where: { id: workflowId, companyId } }),
      this.prisma.department.findFirst({ where: { id: dto.departmentId, companyId, isActive: true } }),
      dto.assignedToId ? this.prisma.user.findFirst({ where: { id: dto.assignedToId, companyId, status: "ACTIVE" } }) : Promise.resolve(null),
    ]);
    if (!workflow) throw new NotFoundException("Workflow not found");
    if (!department) throw new NotFoundException("Active department not found in this company");
    if (dto.assignedToId && !user) throw new NotFoundException("Active assignee not found in this company");

    const task = await this.prisma.task.create({
      data: {
        companyId,
        workflowId,
        createdById: actorId,
        title: dto.title,
        type: dto.type ?? "GENERIC",
        departmentId: dto.departmentId,
        serviceName: dto.serviceName ?? "Custom Tasks",
        assignedToId: dto.assignedToId || undefined,
        status: dto.assignedToId ? "ASSIGNED" : "PENDING",
        priority: dto.priority ?? "MEDIUM",
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        description: dto.description,
        isCustom: true,
        attachments: dto.attachments?.length
          ? {
              create: dto.attachments.map((attachment) => ({
                companyId,
                uploadedById: actorId,
                fileName: attachment.fileName,
                fileUrl: attachment.fileUrl,
                mimeType: attachment.mimeType,
              })),
            }
          : undefined,
      },
      include: { comments: true, attachments: true },
    });

    await this.activityService.log(companyId, actorId, "custom_task_created", `Added custom task '${task.title}' to workflow '${workflow.title}'`);

    if (dto.assignedToId) {
      await this.notificationService.notify(companyId, dto.assignedToId, "New Custom Task Assigned", `You have been assigned '${task.title}'`);
    }

    return task;
  }

  async assign(companyId: string, actorId: string, taskId: string, dto: AssignTaskDto) {
    const [task, user] = await Promise.all([
      this.prisma.task.findFirst({ where: { id: taskId, companyId } }),
      this.prisma.user.findFirst({ where: { id: dto.assignedToId, companyId, status: "ACTIVE" } })
    ]);
    if (!task) throw new NotFoundException("Task not found");
    if (!user) throw new NotFoundException("Active assignee not found in this company");

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: { assignedToId: dto.assignedToId, status: "ASSIGNED" }
    });

    const assigneeName = `${user.firstName} ${user.lastName || ""}`.trim();
    await this.activityService.log(
      companyId,
      actorId,
      "task_assigned",
      `Assigned task '${task.title}' to '${assigneeName}'`
    );

    if (dto.assignedToId) {
      await this.notificationService.notify(
        companyId,
        dto.assignedToId,
        "New Task Assigned",
        `You have been assigned the task '${task.title}'`
      );
    }

    return updatedTask;
  }

  async comment(companyId: string, actorId: string, taskId: string, dto: CreateTaskCommentDto) {
    const task = await this.required(companyId, taskId);
    const comment = await this.prisma.taskComment.create({
      data: { companyId, taskId, authorId: actorId, content: dto.content }
    });

    await this.activityService.log(
      companyId,
      actorId,
      "task_comment_added",
      `Commented on task '${task.title}'`
    );

    return comment;
  }

  async attach(companyId: string, actorId: string, taskId: string, dto: CreateTaskAttachmentDto) {
    const task = await this.required(companyId, taskId);
    const attachment = await this.prisma.taskAttachment.create({
      data: { companyId, taskId, uploadedById: actorId, ...dto }
    });

    await this.activityService.log(
      companyId,
      actorId,
      "task_attachment_added",
      `Uploaded file '${dto.fileName}' to task '${task.title}'`
    );

    return attachment;
  }

  async updateStatus(companyId: string, actorId: string, taskId: string, status: any) {
    const task = await this.required(companyId, taskId);
    if (task.isLocked && status === "COMPLETED") {
      throw new Error("Cannot complete a locked task until prerequisite tasks are finished.");
    }
    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : undefined
      }
    });

    if (status === "COMPLETED") {
      // Automatically unlock downstream tasks depending on this task!
      await this.prisma.task.updateMany({
        where: { companyId, dependsOnTaskId: taskId, isLocked: true },
        data: { isLocked: false }
      });

      await this.activityService.log(
        companyId,
        actorId,
        "task_completed",
        `Completed task '${task.title}'`
      );
    }

    return updated;
  }

  private async required(companyId: string, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, companyId } });
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }
}
