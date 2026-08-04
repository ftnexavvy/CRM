"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./core/prisma/prisma.module");
const company_module_1 = require("./modules/company/company.module");
const auth_module_1 = require("./modules/auth/auth.module");
const user_module_1 = require("./modules/user/user.module");
const workflow_module_1 = require("./modules/workflow/workflow.module");
const chat_module_1 = require("./modules/chat/chat.module");
const lead_module_1 = require("./modules/leads/lead.module");
const client_module_1 = require("./modules/clients/client.module");
const activity_module_1 = require("./modules/activity/activity.module");
const notification_module_1 = require("./modules/notifications/notification.module");
const service_catalog_module_1 = require("./modules/services/service-catalog.module");
const gateway_module_1 = require("./core/gateway/gateway.module");
const announcement_module_1 = require("./modules/announcement/announcement.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ".env",
            }),
            prisma_module_1.PrismaModule,
            company_module_1.CompanyModule,
            auth_module_1.AuthModule,
            user_module_1.UserModule,
            workflow_module_1.WorkflowModule,
            chat_module_1.ChatModule,
            lead_module_1.LeadModule,
            client_module_1.ClientModule,
            activity_module_1.ActivityModule,
            notification_module_1.NotificationModule,
            service_catalog_module_1.ServiceCatalogModule,
            announcement_module_1.AnnouncementModule,
            gateway_module_1.GatewayModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map