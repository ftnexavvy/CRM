import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../core/prisma/prisma.service";

@Injectable()
export class WorkflowRepository {
  constructor(private readonly prisma: PrismaService) {}
  transaction<T>(work: (tx: any) => Promise<T>) { return this.prisma.$transaction(work); }
  findById(companyId: string, id: string) {
    return this.prisma.workflow.findFirst({
      where: { id, companyId },
      include: {
        assignments: { orderBy: { assignedAt: "desc" } },
        tasks: {
          include: {
            comments: { orderBy: { createdAt: "asc" } },
            attachments: { orderBy: { createdAt: "asc" } },
          },
          orderBy: [{ serviceName: "asc" }, { createdAt: "asc" }],
        },
      },
    });
  }
  async timeline(companyId: string, workflowId: string) {
    const history = await this.prisma.workflowHistory.findMany({
      where: { companyId, workflowId },
      orderBy: { createdAt: "asc" },
    });

    const userIds = new Set<string>();
    const deptIds = new Set<string>();
    history.forEach((h: any) => {
      if (h.actorId) userIds.add(h.actorId);
      if (h.toUserId) userIds.add(h.toUserId);
      if (h.fromUserId) userIds.add(h.fromUserId);
      if (h.departmentId) deptIds.add(h.departmentId);
    });

    const [users, depts] = await Promise.all([
      userIds.size > 0
        ? this.prisma.user.findMany({
            where: { id: { in: Array.from(userIds) } },
            select: { id: true, firstName: true, lastName: true, email: true },
          })
        : [],
      deptIds.size > 0
        ? this.prisma.department.findMany({
            where: { id: { in: Array.from(deptIds) } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const userMap = new Map(users.map((u: any) => [u.id, u]));
    const deptMap = new Map(depts.map((d: any) => [d.id, d]));

    return history.map((h: any) => ({
      ...h,
      actor: userMap.get(h.actorId) || null,
      toUser: h.toUserId ? userMap.get(h.toUserId) || null : null,
      fromUser: h.fromUserId ? userMap.get(h.fromUserId) || null : null,
      department: h.departmentId ? deptMap.get(h.departmentId) || null : null,
    }));
  }
  employeeQueue(companyId: string, userId: string) { return this.prisma.workflowAssignment.findMany({ where: { companyId, assignedToId: userId, status: { in: ["ASSIGNED", "ACCEPTED"] } }, include: { workflow: true }, orderBy: { assignedAt: "asc" } }); }
  departmentQueue(companyId: string, departmentId: string) {
    if (departmentId === "unassigned") {
      return this.prisma.workflow.findMany({
        where: {
          companyId,
          currentDepartmentId: null,
          status: "PENDING",
        },
        orderBy: { updatedAt: "desc" },
      });
    }
    return this.prisma.workflow.findMany({
      where: {
        companyId,
        OR: [
          { currentDepartmentId: departmentId },
          { tasks: { some: { departmentId } } },
        ],
        status: { in: ["ASSIGNED", "IN_PROGRESS", "REVIEW", "REVISION"] },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
  dashboard(companyId: string) { return this.prisma.workflow.groupBy({ by: ["currentDepartmentId", "status"], where: { companyId }, _count: { _all: true } }); }
  findBySubject(companyId: string, subjectType: string, subjectId: string) { return this.prisma.workflow.findMany({ where: { companyId, subjectType, subjectId }, orderBy: { updatedAt: "desc" } }); }
  delete(companyId: string, id: string) { return this.prisma.workflow.delete({ where: { id, companyId } }); }
}
