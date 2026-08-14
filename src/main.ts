import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import * as express from "express";
import * as path from "path";
import helmet from "helmet";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
const compression = require("compression");

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable Gzip HTTP response compression for maximum live speed
  app.use(compression());
  app.use(helmet({ contentSecurityPolicy: false }));

  // Serve static uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Global Prefix (excluding public integration routes like Justdial)
  app.setGlobalPrefix("api/v1", {
    exclude: ["api/integrations/(.*)"],
  });

  // Enable CORS (Allow all local & mobile origins)
  app.enableCors({
    origin: (reqOrigin: string | undefined, callback: (err: Error | null, origin?: boolean) => void) => {
      callback(null, true);
    },
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Accept,Authorization,X-Requested-With",
  });



  // Global Exceptions Filter to catch & log detailed errors
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger Configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle("FT Nexavvy CRM API")
    .setDescription("API Documentation for FT Nexavvy CRM")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Swagger URL
  SwaggerModule.setup("api", app, document);

  const port = Number(process.env.PORT) || 3000;

  await app.listen(port, "0.0.0.0");


  Logger.log(
    `🚀 Server running at: http://localhost:${port}/api/v1`,
    "Bootstrap",
  );

  Logger.log(
    `📚 Swagger Docs: http://localhost:${port}/api`,
    "Bootstrap",
  );
}

bootstrap();