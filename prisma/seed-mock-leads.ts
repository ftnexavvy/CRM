import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" })
});

const leadData = [
  {
    name: "Sarah Chen",
    subtitle: "Growth Manager @ NovaTech",
    status: "NEW",
    score: 92,
    intent: "High",
    source: "LinkedIn Ads",
    value: 48000,
    nextAction: "Schedule Pricing Call",
    aiRecommendation: "High conversion probability",
    notes: "Interested in enterprise package."
  },
  {
    name: "David Kim",
    subtitle: "Head of Sales @ Vertex Labs",
    status: "CONTACTED",
    score: 85,
    intent: "High",
    source: "Google Ads",
    value: 72000,
    nextAction: "Send Case Study",
    aiRecommendation: "Enterprise interest detected",
    notes: "Requires standard NDA first."
  },
  {
    name: "Jonathan Miller",
    subtitle: "Founder @ BrightScale",
    status: "NEGOTIATION",
    score: 77,
    intent: "Medium",
    source: "Referral",
    value: 125000,
    nextAction: "Follow-up Proposal",
    aiRecommendation: "Pricing objection detected",
    notes: "Requested a discount on implementation fees."
  },
  {
    name: "Emily Rodriguez",
    subtitle: "Marketing Director @ Orbit AI",
    status: "NEW",
    score: 68,
    intent: "Medium",
    source: "TikTok Ads",
    value: 18000,
    nextAction: "Schedule Pricing Call",
    aiRecommendation: "High conversion probability",
    notes: "Wants automated social posting features."
  },
  {
    name: "Rachel Adams",
    subtitle: "VP Marketing @ Lumina Cloud",
    status: "PROPOSAL_SENT",
    score: 89,
    intent: "High",
    source: "Organic Search",
    value: 96000,
    nextAction: "Final ROI Discussion",
    aiRecommendation: "Likely to close this week",
    notes: "Proposal was reviewed positively by CFO."
  },
  {
    name: "Ethan Walker",
    subtitle: "Revenue Ops @ ApexScale",
    status: "CONTACTED",
    score: 58,
    intent: "Low",
    source: "Meta Ads",
    value: 12000,
    nextAction: "Re-engagement Email",
    aiRecommendation: "Engagement dropping",
    notes: "Has not responded to the last 2 follow-ups."
  },
  {
    name: "Sophia Bennett",
    subtitle: "COO @ Zenify",
    status: "QUALIFIED",
    score: 81,
    intent: "High",
    source: "Webinar",
    value: 54000,
    nextAction: "Schedule Demo",
    aiRecommendation: "Strong buying signals",
    notes: "Attended the scaling API webinar last Tuesday."
  },
  {
    name: "Daniel Park",
    subtitle: "Sales Lead @ Flowbyte",
    status: "NEW",
    score: 64,
    intent: "Medium",
    source: "LinkedIn Organic",
    value: 22000,
    nextAction: "Intro Outreach",
    aiRecommendation: "Similar to converted leads",
    notes: "Downloaded flowbyte whitepaper."
  },
  {
    name: "Olivia Carter",
    subtitle: "Founder @ MetricLoop",
    status: "NEGOTIATION",
    score: 91,
    intent: "High",
    source: "Referral Partner",
    value: 210000,
    nextAction: "Contract Review",
    aiRecommendation: "Strategic account potential",
    notes: "High priority client. Redlining contract drafts."
  },
  {
    name: "Marcus Rivera",
    subtitle: "Demand Gen Manager @ Skylab",
    status: "PROPOSAL_SENT",
    score: 74,
    intent: "Medium",
    source: "Google Ads",
    value: 38000,
    nextAction: "Follow-up Call",
    aiRecommendation: "Decision maker inactive",
    notes: "Checking in on budget approval."
  }
];

async function seed() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.error("No company found in database! Create one first.");
    return;
  }
  console.log(`Using company: ${company.companyName} (${company.id})`);

  const users = await prisma.user.findMany({
    where: { companyId: company.id }
  });
  console.log(`Found ${users.length} users to distribute assignments.`);

  // Delete existing leads to avoid clutter
  await prisma.lead.deleteMany({ where: { companyId: company.id } });
  console.log("Cleared existing leads.");

  for (let i = 0; i < leadData.length; i++) {
    const data = leadData[i];
    const assignedUser = users.length > 0 ? users[i % users.length] : null;
    
    await prisma.lead.create({
      data: {
        companyId: company.id,
        name: data.name,
        subtitle: data.subtitle,
        status: data.status as any,
        score: data.score,
        intent: data.intent,
        source: data.source,
        value: data.value,
        nextAction: data.nextAction,
        aiRecommendation: data.aiRecommendation,
        notes: data.notes,
        assignedToId: assignedUser ? assignedUser.id : null
      }
    });
  }

  console.log(`Successfully seeded ${leadData.length} premium mockup leads!`);
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
