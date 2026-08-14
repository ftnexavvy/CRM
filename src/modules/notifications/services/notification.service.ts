import { Injectable } from "@nestjs/common";
import { NotificationRepository } from "../repositories/notification.repository";
import { AppGateway } from "../../../core/gateway/app.gateway";

@Injectable()
export class NotificationService {
  constructor(
    private readonly repo: NotificationRepository,
    private readonly gateway: AppGateway,
  ) {}

  async notify(companyId: string, userId: string, title: string, message: string) {
    const notification = await this.repo.create(companyId, userId, title, message);
    this.gateway.emitToUser(userId, 'new_notification', notification);
    return notification;
  }

  async notifyCompany(companyId: string, title: string, message: string, eventType?: string, data?: any) {
    const payload = {
      id: Math.random().toString(36).substring(2, 9),
      companyId,
      title,
      message,
      isRead: false,
      createdAt: new Date().toISOString(),
      eventType: eventType || 'general',
      data
    };
    this.gateway.emitToCompany(companyId, 'new_notification', payload);
    if (eventType) {
      this.gateway.emitToCompany(companyId, eventType, payload);
    }
    return payload;
  }

  async findAll(companyId: string, userId: string) {
    return this.repo.findMany(companyId, userId);
  }

  async markAsRead(id: string) {
    return this.repo.updateRead(id, true);
  }

  async markAllRead(companyId: string, userId: string) {
    return this.repo.markAllAsRead(companyId, userId);
  }

  async checkTaskReminders(prisma: any) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const endOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59);

    // Find pending/in-progress tasks with assignees
    const tasks = await prisma.task.findMany({
      where: {
        status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
        assignedToId: { not: null },
        dueDate: { not: null },
      },
    });

    for (const task of tasks) {
      if (!task.assignedToId || !task.dueDate) continue;
      const due = new Date(task.dueDate);

      if (due < startOfToday) {
        // Overdue
        await this.notify(task.companyId, task.assignedToId, "🚨 Overdue Task Alert", `Task '${task.title}' was due on ${due.toLocaleDateString()} and is overdue!`);
      } else if (due >= startOfToday && due <= endOfToday) {
        // Due today
        await this.notify(task.companyId, task.assignedToId, "⏰ Task Due Today", `Reminder: Task '${task.title}' is due today!`);
      } else if (due > endOfToday && due <= endOfTomorrow) {
        // Due tomorrow
        await this.notify(task.companyId, task.assignedToId, "🗓️ Task Due Tomorrow", `Upcoming: Task '${task.title}' is due tomorrow.`);
      }
    }
  }

  async checkPaymentReminders(prisma: any) {
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 86400000);

    // 1. Check Clients with nextBillingDate due soon or overdue
    const clients = await prisma.client.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: { not: null, lte: threeDaysFromNow },
      },
    });

    for (const client of clients) {
      if (!client.nextBillingDate) continue;
      const due = new Date(client.nextBillingDate);
      const isOverdue = due < now;
      const title = isOverdue ? '🚨 Payment Overdue Alert' : '⏰ Upcoming Payment Due';
      const message = isOverdue
        ? `Payment from client '${client.name}' was due on ${due.toLocaleDateString('en-IN')} and is OVERDUE!`
        : `Reminder: Payment from client '${client.name}' is due on ${due.toLocaleDateString('en-IN')}.`;

      await this.notifyCompany(client.companyId, title, message, 'payment_alert', {
        clientId: client.id,
        clientName: client.name,
        dueDate: client.nextBillingDate,
        isOverdue,
      });
    }

    // 2. Check Unpaid Invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        status: { in: ['SENT', 'DRAFT', 'PARTIALLY_PAID'] },
        dueDate: { lte: threeDaysFromNow },
      },
    });

    for (const inv of invoices) {
      const due = new Date(inv.dueDate);
      const isOverdue = due < now;
      const title = isOverdue ? '🚨 Invoice Overdue' : '⏰ Invoice Payment Due Soon';
      const message = `Invoice #${inv.invoiceNumber} (${inv.clientCompanyName}) of ₹${inv.totalAmount.toLocaleString('en-IN')} is ${isOverdue ? 'OVERDUE' : 'due soon'} on ${due.toLocaleDateString('en-IN')}.`;

      await this.notifyCompany(inv.companyId, title, message, 'invoice_alert', {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientCompanyName,
        totalAmount: inv.totalAmount,
        dueDate: inv.dueDate,
        isOverdue,
      });
    }
  }
}
