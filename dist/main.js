"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const express = __importStar(require("express"));
const path = __importStar(require("path"));
const helmet_1 = __importDefault(require("helmet"));
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const compression = require("compression");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // Enable Gzip HTTP response compression for maximum live speed
    app.use(compression());
    app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
    // Serve static uploaded files
    app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
    // Global Prefix
    app.setGlobalPrefix("api/v1");
    // Enable CORS (Allow all local & mobile origins)
    app.enableCors({
        origin: (reqOrigin, callback) => {
            callback(null, true);
        },
        credentials: true,
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
        allowedHeaders: "Content-Type,Accept,Authorization,X-Requested-With",
    });
    // Global Exceptions Filter to catch & log detailed errors
    app.useGlobalFilters(new all_exceptions_filter_1.AllExceptionsFilter());
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
    await app.listen(port, "0.0.0.0");
    common_1.Logger.log(`🚀 Server running at: http://localhost:${port}/api/v1`, "Bootstrap");
    common_1.Logger.log(`📚 Swagger Docs: http://localhost:${port}/api`, "Bootstrap");
}
bootstrap();
//# sourceMappingURL=main.js.map