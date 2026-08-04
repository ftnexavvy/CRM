import { Module } from "@nestjs/common";
import { AnnouncementController } from "./controllers/announcement.controller";
import { AnnouncementService } from "./services/announcement.service";
import { PrismaService } from "../../core/prisma/prisma.service";

@Module({
  controllers: [AnnouncementController],
  providers: [AnnouncementService, PrismaService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
