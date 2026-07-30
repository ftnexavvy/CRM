import { Module } from "@nestjs/common";
import { ClientController } from "./controllers/client.controller";
import { ClientService } from "./services/client.service";
import { ClientRepository } from "./repositories/client.repository";
import { PrismaService } from "../../core/prisma/prisma.service";
import { WorkflowModule } from "../workflow/workflow.module";
import { ActivityModule } from "../activity/activity.module";

@Module({
  imports: [WorkflowModule, ActivityModule],
  controllers: [ClientController],
  providers: [ClientService, ClientRepository, PrismaService],
  exports: [ClientService],
})
export class ClientModule {}
