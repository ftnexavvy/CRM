import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./core/prisma/prisma.module";
import { CompanyModule } from "./modules/company/company.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { WorkflowModule } from "./modules/workflow/workflow.module";

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
  ],
})
export class AppModule {}
