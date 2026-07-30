import { Global, Module } from "@nestjs/common";
import { ActivityController } from "./controllers/activity.controller";
import { ActivityService } from "./services/activity.service";
import { ActivityRepository } from "./repositories/activity.repository";
import { PrismaService } from "../../core/prisma/prisma.service";

@Global()
@Module({
  controllers: [ActivityController],
  providers: [ActivityService, ActivityRepository, PrismaService],
  exports: [ActivityService],
})
export class ActivityModule {}
