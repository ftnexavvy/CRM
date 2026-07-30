import { Global, Module } from "@nestjs/common";
import { NotificationController } from "./controllers/notification.controller";
import { NotificationService } from "./services/notification.service";
import { NotificationRepository } from "./repositories/notification.repository";
import { PrismaService } from "../../core/prisma/prisma.service";

@Global()
@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository, PrismaService],
  exports: [NotificationService],
})
export class NotificationModule {}
