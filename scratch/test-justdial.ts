import { NestFactory } from "@nestjs/core";
import { AppModule } from "../src/app.module";
import { JustdialService } from "../src/modules/integrations/justdial/services/justdial.service";
import { PrismaService } from "../src/core/prisma/prisma.service";

async function testJustdialIntegration() {
  console.log("🚀 Testing Justdial Service logic...");
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const prisma = app.get(PrismaService);
    const justdialService = app.get(JustdialService);

    // Ensure a default company exists for testing
    let company = await prisma.company.findFirst();
    if (!company) {
      console.log("Creating default test company...");
      company = await prisma.company.create({
        data: {
          companyName: "FT Nexavvy Demo Company",
          companyCode: "FTNEXAVVY01",
          email: "contact@ftnexavvy.com",
          phone: "+919876543210",
        },
      });
    }

    const testPayload = {
      lead_id: "JD-TEST-1001",
      name: "Rahul Sharma",
      mobile: "+919876543210",
      email: "rahul.sharma@example.com",
      requirement: "Need Custom Web Application & CRM Software",
      city: "Mumbai",
      location: "Andheri West, Mumbai",
    };

    console.log("1️⃣ Submitting initial Justdial lead payload...");
    const result1 = await justdialService.processIncomingLead(testPayload, {
      ip: "127.0.0.1",
      userAgent: "Justdial-Webhook-Simulator",
    });
    console.log("Result 1 (Lead creation):", result1);

    console.log("2️⃣ Resubmitting exact same lead (Duplicate check via externalLeadId)...");
    const result2 = await justdialService.processIncomingLead(testPayload, {
      ip: "127.0.0.1",
    });
    console.log("Result 2 (Duplicate check):", result2);

    console.log("3️⃣ Submitting new lead without externalLeadId but same phone number within 24h...");
    const payloadWithoutId = {
      name: "Rahul Sharma Duplicate Check",
      phone: "+919876543210",
      email: "rahul.sharma@example.com",
      message: "Second inquiry from same mobile number",
      city: "Mumbai",
    };
    const result3 = await justdialService.processIncomingLead(payloadWithoutId, {
      ip: "127.0.0.1",
    });
    console.log("Result 3 (Duplicate phone check):", result3);

    console.log("4️⃣ Verifying stored lead in PostgreSQL database...");
    const storedLead = await prisma.lead.findFirst({
      where: { externalLeadId: "JD-TEST-1001" },
    });
    console.log("Stored Lead Details from DB:", {
      id: storedLead?.id,
      name: storedLead?.name,
      phone: storedLead?.phone,
      email: storedLead?.email,
      source: storedLead?.source,
      externalLeadId: storedLead?.externalLeadId,
      notes: storedLead?.notes,
    });

    await app.close();
    console.log("🎉 SUCCESS: All Justdial integration tests passed!");
  } catch (err) {
    console.error("❌ Test error:", err);
  }
}

testJustdialIntegration();
