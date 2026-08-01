"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // Global Prefix
    app.setGlobalPrefix("api/v1");
    // Enable CORS
    app.enableCors({
        origin: [
            "https://ftnexavvycrm.vercel.app",
            "http://localhost:4200",
            "http://localhost:3000"
        ],
        credentials: true,
    });
    // Global Validation
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    // Swagger Configuration
    const swaggerConfig = new swagger_1.DocumentBuilder()
        .setTitle("FT Nexavvy CRM API")
        .setDescription("API Documentation for FT Nexavvy CRM")
        .setVersion("1.0.0")
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, swaggerConfig);
    // Swagger URL
    swagger_1.SwaggerModule.setup("api", app, document);
    const port = Number(process.env.PORT) || 3000;
    await app.listen(port);
    common_1.Logger.log(`🚀 Server running at: http://localhost:${port}/api/v1`, "Bootstrap");
    common_1.Logger.log(`📚 Swagger Docs: http://localhost:${port}/api`, "Bootstrap");
}
bootstrap();
//# sourceMappingURL=main.js.map