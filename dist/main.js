"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle("FT Nexavvy CRM API")
        .setDescription("API documentation for FT Nexavvy CRM")
        .setVersion("1.0")
        .build();
    swagger_1.SwaggerModule.setup("api", app, swagger_1.SwaggerModule.createDocument(app, swaggerConfig));
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    await app.listen(port);
    common_1.Logger.log(`Application running on: http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map