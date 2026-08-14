import { Module } from "@nestjs/common";
import { JustdialController, JustdialV1Controller } from "./controllers/justdial.controller";
import { JustdialService } from "./services/justdial.service";
import { PrismaModule } from "../../../core/prisma/prisma.module";
import { NotificationModule } from "../../notifications/notification.module";
import { JustdialSecretGuard } from "./guards/justdial-secret.guard";

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [JustdialController, JustdialV1Controller],
  providers: [JustdialService, JustdialSecretGuard],
  exports: [JustdialService],
})
export class JustdialModule {}
