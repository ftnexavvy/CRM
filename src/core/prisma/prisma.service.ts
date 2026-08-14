import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function cleanDbUrl(url: string): string {
  if (!url) return "";
  let cleaned = url.trim();
  // Neon Pooler (PgBouncer) rejects SCRAM channel_binding=require. Strip it to allow clean connection.
  cleaned = cleaned.replace(/&?channel_binding=[^&]*/gi, "");
  if (cleaned.endsWith("?") || cleaned.endsWith("&")) {
    cleaned = cleaned.slice(0, -1);
  }
  cleaned = cleaned.replace(/\?&/g, "?");
  return cleaned;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  [key: string]: any;

  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const rawUrl = process.env.DATABASE_URL ?? "";
    const connectionString = cleanDbUrl(rawUrl);

    super({
      adapter: new PrismaPg({
        connectionString,
      }),
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("✅ PostgreSQL Database connected successfully");
    } catch (error) {
      this.logger.error("❌ Database connection error:", error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
