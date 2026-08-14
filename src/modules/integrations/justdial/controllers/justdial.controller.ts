import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from "@nestjs/swagger";
import { Request } from "express";
import { JustdialService } from "../services/justdial.service";
import { JustdialSecretGuard } from "../guards/justdial-secret.guard";

@ApiTags("Integrations - Justdial")
@UseGuards(JustdialSecretGuard)
@Controller("api/integrations/justdial")
export class JustdialController {
  constructor(private readonly justdialService: JustdialService) {}

  @Post("leads")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Public webhook endpoint for receiving leads from Justdial" })
  @ApiHeader({
    name: "x-justdial-secret",
    required: false,
    description: "Optional secret key configured in JUSTDIAL_API_SECRET environment variable",
  })
  @ApiResponse({
    status: 200,
    description: "Lead received successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        message: { type: "string", example: "Lead received successfully" },
      },
    },
  })
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
  async receiveLead(@Body() body: any, @Req() req: Request) {
    const reqInfo = {
      ip: req.ip || (req.headers["x-forwarded-for"] as string),
      userAgent: req.headers["user-agent"],
      headers: {
        "content-type": req.headers["content-type"],
        "x-justdial-secret": req.headers["x-justdial-secret"] ? "*****" : undefined,
      },
    };

    return this.justdialService.processIncomingLead(body, reqInfo);
  }

  @Get("leads/test")
  @ApiOperation({ summary: "Test endpoint returning sample Justdial payload and curl command" })
  async getTestInfo() {
    return {
      success: true,
      message: "Justdial Integration Endpoint is Active and Ready",
      endpointUrl: "/api/integrations/justdial/leads",
      samplePayload: {
        lead_id: "JD-2026-987654",
        name: "Rahul Sharma",
        mobile: "+919876543210",
        email: "rahul.sharma@example.com",
        requirement: "Need Website Development and CRM Customization",
        city: "Mumbai",
        location: "Andheri West, Mumbai",
        source: "JUSTDIAL",
        created_at: "2026-08-14 10:30:00",
      },
      curlExample: `curl -X POST http://localhost:3000/api/integrations/justdial/leads -H "Content-Type: application/json" -d '{"lead_id":"JD-123456","name":"Rahul Sharma","mobile":"9876543210","email":"rahul@example.com","requirement":"Software Development","city":"Mumbai"}'`,
    };
  }

  @Post("leads/test")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Manual test lead submission" })
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
  async testLeadSubmission(@Body() body: any, @Req() req: Request) {
    const reqInfo = {
      ip: req.ip || (req.headers["x-forwarded-for"] as string),
      userAgent: req.headers["user-agent"],
    };

    return this.justdialService.processIncomingLead(body, reqInfo);
  }
}

// Alias Controller for /api/v1/integrations/justdial/leads to ensure support for v1 path
@ApiTags("Integrations - Justdial (v1 Alias)")
@UseGuards(JustdialSecretGuard)
@Controller("api/v1/integrations/justdial")
export class JustdialV1Controller {
  constructor(private readonly justdialService: JustdialService) {}

  @Post("leads")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Public webhook endpoint for receiving leads from Justdial (v1 alias)" })
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
  async receiveLead(@Body() body: any, @Req() req: Request) {
    const reqInfo = {
      ip: req.ip || (req.headers["x-forwarded-for"] as string),
      userAgent: req.headers["user-agent"],
    };

    return this.justdialService.processIncomingLead(body, reqInfo);
  }
}
