import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./core/prisma/prisma.module";
import { CompanyModule } from "./modules/company/company.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";
import { ChatModule } from "./modules/chat/chat.module";
import { LeadModule } from "./modules/leads/lead.module";
import { ClientModule } from "./modules/clients/client.module";
import { ActivityModule } from "./modules/activity/activity.module";
import { NotificationModule } from "./modules/notifications/notification.module";
import { ServiceCatalogModule } from "./modules/services/service-catalog.module";
import { GatewayModule } from "./core/gateway/gateway.module";

import { AnnouncementModule } from "./modules/announcement/announcement.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    PrismaModule,
    CompanyModule,
    AuthModule,
    UserModule,
    WorkflowModule,
    ChatModule,
    LeadModule,
    ClientModule,
    ActivityModule,
    NotificationModule,
    ServiceCatalogModule,
    AnnouncementModule,
    GatewayModule,
  ],
})
export class AppModule {}

