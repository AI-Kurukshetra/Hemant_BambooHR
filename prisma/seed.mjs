import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLE_DEFINITIONS = [
  {
    key: "hr_admin",
    name: "HR Admin",
    description: "Manages employee records, documents, leave policies, and approvals.",
  },
  {
    key: "employee",
    name: "Employee",
    description: "Self-service access to own profile, leave, and payslips.",
  },
];

async function main() {
  const defaultCompanyName = process.env.SEED_COMPANY_NAME || "Default Company";
  let companies = await prisma.company.findMany({
    select: { id: true, name: true },
  });

  if (companies.length === 0) {
    const company = await prisma.company.create({
      data: { name: defaultCompanyName },
      select: { id: true, name: true },
    });
    companies = [company];
    console.log(`Created default company: ${company.name} (${company.id})`);
  }

  for (const company of companies) {
    for (const role of ROLE_DEFINITIONS) {
      await prisma.role.upsert({
        where: {
          companyId_key: {
            companyId: company.id,
            key: role.key,
          },
        },
        update: {
          name: role.name,
          description: role.description,
        },
        create: {
          companyId: company.id,
          key: role.key,
          name: role.name,
          description: role.description,
        },
      });
    }
    console.log(
      `Seeded roles for company ${company.name} (${company.id}): ${ROLE_DEFINITIONS.map((role) => role.key).join(", ")}`,
    );
  }
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
