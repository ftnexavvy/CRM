import { Injectable, Logger, BadRequestException, InternalServerErrorException } from "@nestjs/common";
import { PrismaService } from "../../../../core/prisma/prisma.service";
import { NotificationService } from "../../../notifications/services/notification.service";
import { LeadStatus } from "@prisma/client";

@Injectable()
export class JustdialService {
  private readonly logger = new Logger(JustdialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService
  ) {}

  async processIncomingLead(rawPayload: Record<string, any>, reqInfo?: { ip?: string; userAgent?: string; headers?: any }) {
    // 1. Log request metadata and full payload
    this.logger.log(`--------------------------------------------------`);
    this.logger.log(`📥 Incoming Justdial lead request from IP: ${reqInfo?.ip || "unknown"}`);
    if (reqInfo?.headers) {
      this.logger.log(`Headers: ${JSON.stringify(reqInfo.headers)}`);
    }
    this.logger.log(`Payload Dump:\n${JSON.stringify(rawPayload, null, 2)}`);
    this.logger.log(`--------------------------------------------------`);

    // 2. Validate Malformed Requests
    if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
      throw new BadRequestException("Invalid request payload. Expected a valid JSON object.");
    }

    // 3. Normalize Incoming Fields
    const name = (
      rawPayload.name ||
      rawPayload.full_name ||
      rawPayload.customer_name ||
      rawPayload.lead_name ||
      rawPayload.caller_name ||
      "Justdial Lead"
    ).toString().trim();

    const rawPhone = (
      rawPayload.mobile ||
      rawPayload.phone ||
      rawPayload.phone_number ||
      rawPayload.contact ||
      rawPayload.mobile_number ||
      ""
    ).toString().trim();

    const email = (
      rawPayload.email ||
      rawPayload.email_id ||
      rawPayload.customer_email ||
      null
    )?.toString().trim() || null;

    const requirement = (
      rawPayload.requirement ||
      rawPayload.message ||
      rawPayload.category ||
      rawPayload.query ||
      rawPayload.notes ||
      ""
    ).toString().trim();

    const city = (
      rawPayload.city ||
      rawPayload.location ||
      rawPayload.address ||
      rawPayload.area ||
      ""
    ).toString().trim();

    const externalLeadId = (
      rawPayload.lead_id ||
      rawPayload.leadid ||
      rawPayload.leadId ||
      rawPayload.external_id ||
      rawPayload.id ||
      null
    )?.toString().trim() || null;

    // Reject payload if essential information is missing
    if (!rawPhone && !email && name === "Justdial Lead") {
      throw new BadRequestException("Malformed payload. Must contain at least name, mobile/phone, or email.");
    }

    const phone = rawPhone ? rawPhone : null;
    const cleanPhoneDigits = rawPhone ? rawPhone.replace(/\D/g, "") : null;

    // 4. Determine Target Company ID
    let companyId = rawPayload.companyId || rawPayload.company_id || process.env.JUSTDIAL_DEFAULT_COMPANY_ID;
    if (!companyId) {
      const company = await this.prisma.company.findFirst();
      if (!company) {
        throw new InternalServerErrorException("No company record found in CRM database.");
      }
      companyId = company.id;
    }

    // 5. Duplicate Protection
    // Check 1: By externalLeadId
    if (externalLeadId) {
      const existingByExternalId = await this.prisma.lead.findFirst({
        where: {
          companyId,
          externalLeadId,
        },
      });

      if (existingByExternalId) {
        this.logger.warn(`Duplicate Justdial lead ignored (externalLeadId match: '${externalLeadId}')`);
        return {
          success: true,
          message: "Lead received successfully",
        };
      }
    }

    // Check 2: By phone within 24 hours
    if (phone && cleanPhoneDigits && cleanPhoneDigits.length >= 7) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const searchPattern = cleanPhoneDigits.slice(-10);

      const existingByPhone = await this.prisma.lead.findFirst({
        where: {
          companyId,
          phone: { contains: searchPattern },
          createdAt: { gte: twentyFourHoursAgo },
        },
      });

      if (existingByPhone) {
        this.logger.warn(`Duplicate Justdial lead ignored (Phone match '${phone}' within 24h window)`);
        return {
          success: true,
          message: "Lead received successfully",
        };
      }
    }

    // 6. Build Notes and Subtitle
    const notesParts: string[] = [];
    if (requirement) notesParts.push(`Requirement: ${requirement}`);
    if (city) notesParts.push(`Location/City: ${city}`);
    if (externalLeadId) notesParts.push(`Justdial Lead ID: ${externalLeadId}`);
    notesParts.push(`Raw Payload: ${JSON.stringify(rawPayload)}`);

    const notes = notesParts.join("\n");
    const subtitle = [city, requirement].filter(Boolean).join(" • ") || "Justdial Lead";

    // 7. Store Normalized Lead in PostgreSQL Database
    const lead = await this.prisma.lead.create({
      data: {
        companyId,
        name,
        phone,
        email,
        source: "JUSTDIAL",
        status: LeadStatus.NEW,
        notes,
        subtitle,
        externalLeadId,
      },
    });

    this.logger.log(`✅ Justdial Lead successfully stored with CRM ID: ${lead.id}`);

    // 8. Trigger Realtime Notification for CRM Users
    try {
      await this.notificationService.notifyCompany(
        companyId,
        "🎯 New Justdial Lead",
        `New lead '${name}' received from Justdial (${city || "India"})`,
        "justdial_lead_created",
        lead
      );
    } catch (notifErr) {
      const msg = notifErr instanceof Error ? notifErr.message : String(notifErr);
      this.logger.warn(`Notification error (non-fatal): ${msg}`);
    }

    return {
      success: true,
      message: "Lead received successfully",
    };
  }
}
