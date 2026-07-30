import { Module } from "@nestjs/common";
import { ServiceCatalogController } from "./service-catalog.controller";
import { ServiceCatalogService } from "./services/service-catalog.service";
import { ServiceCatalogRepository } from "./repositories/service-catalog.repository";
import { PrismaService } from "../../core/prisma/prisma.service";

@Module({
  controllers: [ServiceCatalogController],
  providers: [ServiceCatalogService, ServiceCatalogRepository, PrismaService],
  exports: [ServiceCatalogService, ServiceCatalogRepository],
})
export class ServiceCatalogModule {}
