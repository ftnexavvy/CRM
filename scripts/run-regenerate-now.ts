import * as dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { WorkflowAutoAssignService } from "../src/modules/workflow/services/workflow-auto-assign.service";
import { NotificationService } from "../src/modules/notifications/services/notification.service";
import { ActivityService } from "../src/modules/activity/services/activity.service";

import { NotificationRepository } from "../src/modules/notifications/repositories/notification.repository";

import { ActivityRepository } from "../src/modules/activity/repositories/activity.repository";

const connectionString = process.env.DATABASE_URL || "postgresql://ftnexavvy@localhost:5432/ftcrm?schema=public";
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function runNow() {
  const client = await prisma.client.findFirst();
  if (!client) return;

  const admin = await prisma.user.findFirst({ where: { role: { name: { in: ["Admin", "Administrator"] } } } });
  if (!admin) return;

  const actRepo = new ActivityRepository(prisma as any);
  const activityService = new ActivityService(actRepo);
  const notifRepo = new NotificationRepository(prisma as any);
  const notifService = new NotificationService(notifRepo);
  const autoAssign = new WorkflowAutoAssignService(prisma as any, notifService, activityService);

  console.log("Running onboardClient(regenerate = true) for client", client.name);
  const res = await autoAssign.onboardClient(client.companyId, admin.id, client.id, true);
  
  const tasks = await prisma.task.findMany({ where: { workflowId: res.id } });
  console.log("Newly generated tasks total:", tasks.length);

  const graphicTasks = tasks.filter((t) => t.type === "GRAPHIC");
  console.log("Graphic tasks count:", graphicTasks.length);
  if (graphicTasks.length) {
    console.log("Sample graphic task:", {
      title: graphicTasks[0].title,
      departmentId: graphicTasks[0].departmentId,
      assignedToId: graphicTasks[0].assignedToId,
      status: graphicTasks[0].status,
    });
  }

  const assignedUsers = await prisma.user.findMany({ where: { id: { in: tasks.map(t => t.assignedToId).filter(Boolean) as string[] } } });
  console.log("Assigned Employees summary:", assignedUsers.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, dept: u.department })));
}

runNow().then(() => prisma.$disconnect());
