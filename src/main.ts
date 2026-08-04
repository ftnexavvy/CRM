import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import * as express from "express";
import * as path from "path";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Serve static uploaded files
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Global Prefix
  app.setGlobalPrefix("api/v1");

  // Enable CORS (Allow all local & mobile origins)
  app.enableCors({
    origin: (reqOrigin: string | undefined, callback: (err: Error | null, origin?: boolean) => void) => {
      callback(null, true);
    },
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Accept,Authorization,X-Requested-With",
  });



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