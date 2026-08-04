import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { AssignTaskDto, CreateCustomTaskDto, CreateTaskAttachmentDto, CreateTaskCommentDto, UpdateTaskStatusDto } from "../dto/workflow.dto";
import { ActivityService } from "../../activity/services/activity.service";
import { NotificationService } from "../../notifications/services/notification.service";

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly notificationService: NotificationService
  ) { }

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

  async updateStatus(companyId: string, actorId: string, taskId: string, dto: UpdateTaskStatusDto) {
    const task = await this.required(companyId, taskId);
    const status = dto.status as any;
    if (task.isLocked && status === "COMPLETED") {
      throw new Error("Cannot complete a locked task until prerequisite tasks are finished.");
    }
    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === "COMPLETED" ? new Date() : undefined,
        publishedPlatforms: dto.publishedPlatforms || undefined
      }
    });

    if (status === "COMPLETED") {
      // Find all tasks in the same workflow with the same title (handles legacy duplicate tasks or dependency mismatches)
      const sameTitleTasks = await this.prisma.task.findMany({
        where: { workflowId: task.workflowId, title: task.title },
        select: { id: true }
      });
      const targetIds = Array.from(new Set([...sameTitleTasks.map((t) => t.id), taskId]));

      // Automatically unlock downstream tasks depending on this task or any same-titled task!
      const unlockedTasks = await this.prisma.task.findMany({
        where: {
          companyId,
          dependsOnTaskId: {
            in: targetIds
          },
          isLocked: true
        }
      });

      for (const nextTask of unlockedTasks) {

        await this.prisma.task.update({
          where: {
            id: nextTask.id
          },
          data: {
            isLocked: false,
            status: nextTask.assignedToId
              ? "ASSIGNED"
              : "PENDING"
          }
        });

        if (nextTask.assignedToId) {

          await this.notificationService.notify(
            companyId,
            nextTask.assignedToId,
            "New Task Unlocked",
            `Task "${nextTask.title}" is now ready to start.`
          );

        }

      }

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

  async getPostsByDate(companyId: string) {
    const tasks = await this.prisma.task.findMany({
      where: {
        companyId,
        workflow: {
          subjectType: "CLIENT",
        },
        OR: [
          { type: { in: ['CONTENT', 'POST', 'REEL', 'GRAPHIC'] } },
          { title: { contains: 'Post' } },
          { title: { contains: 'Reel' } },
          { title: { contains: 'Carousel' } },
          { title: { contains: 'Story' } }
        ]
      },
      include: {
        workflow: true,
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, profileImage: true }
        },
        attachments: true,
        comments: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    const clientIds = [...new Set(tasks.map(t => t.workflow.subjectId))];
    const clients = await this.prisma.client.findMany({
      where: {
        id: { in: clientIds },
        companyId
      },
      select: { id: true, name: true, email: true, phone: true, services: { include: { service: true } } }
    });

    const clientMap = new Map(clients.map(c => [c.id, c]));

    return tasks.map(task => {
      const client = clientMap.get(task.workflow.subjectId);
      const cId = client ? client.id : task.workflow.subjectId;
      const cName = client ? client.name : task.workflow.title.replace(/^Client Tasks - /i, '');
      return {
        ...task,
        clientId: cId || 'client-default',
        clientName: cName || 'Client',
        clientServices: client ? client.services : []
      };
    });
  }
}
