import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  await app.listen(port);

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