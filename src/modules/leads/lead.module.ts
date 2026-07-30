import { Module } from "@nestjs/common";
import { LeadController } from "./controllers/lead.controller";
import { LeadService } from "./services/lead.service";
import { LeadRepository } from "./repositories/lead.repository";
import { PrismaService } from "../../core/prisma/prisma.service";

@Module({
  controllers: [LeadController],
  providers: [LeadService, LeadRepository, PrismaService],
  exports: [LeadService],
})
export class LeadModule {}
