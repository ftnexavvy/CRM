import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";
import { AssignTaskDto, CreateTaskAttachmentDto, CreateTaskCommentDto } from "../dto/workflow.dto";

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}
  async assign(companyId: string, taskId: string, dto: AssignTaskDto) {
    const [task, user] = await Promise.all([this.prisma.task.findFirst({ where: { id: taskId, companyId } }), this.prisma.user.findFirst({ where: { id: dto.assignedToId, companyId, status: "ACTIVE" } })]);
    if (!task) throw new NotFoundException("Task not found"); if (!user) throw new NotFoundException("Active assignee not found in this company");
    return this.prisma.task.update({ where: { id: taskId }, data: { assignedToId: dto.assignedToId, status: "ASSIGNED" } });
  }
  async comment(companyId: string, actorId: string, taskId: string, dto: CreateTaskCommentDto) {
    await this.required(companyId, taskId);
    return this.prisma.taskComment.create({ data: { companyId, taskId, authorId: actorId, content: dto.content } });
  }
  async attach(companyId: string, actorId: string, taskId: string, dto: CreateTaskAttachmentDto) {
    await this.required(companyId, taskId);
    return this.prisma.taskAttachment.create({ data: { companyId, taskId, uploadedById: actorId, ...dto } });
  }
  private async required(companyId: string, id: string) { const task = await this.prisma.task.findFirst({ where: { id, companyId } }); if (!task) throw new NotFoundException("Task not found"); return task; }
}
