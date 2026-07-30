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
  timeline(companyId: string, workflowId: string) { return this.prisma.workflowHistory.findMany({ where: { companyId, workflowId }, orderBy: { createdAt: "asc" } }); }
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
