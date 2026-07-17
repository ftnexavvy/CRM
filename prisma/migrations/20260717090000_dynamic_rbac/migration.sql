-- Dynamic RBAC: migrate existing fixed enum roles into per-company role records.
CREATE TABLE "roles" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
  "isSystemRole" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "permissions" (
  "id" TEXT NOT NULL, "module" TEXT NOT NULL, "action" TEXT NOT NULL, "key" TEXT NOT NULL, "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "role_permissions" (
  "roleId" TEXT NOT NULL, "permissionId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId")
);
ALTER TABLE "users" ADD COLUMN "department" TEXT;
ALTER TABLE "users" ADD COLUMN "roleId" TEXT;
-- Existing users receive a company-local system role named after their former enum value.
INSERT INTO "roles" ("id", "companyId", "name", "description", "isSystemRole", "createdAt", "updatedAt")
SELECT concat('legacy_', md5("companyId" || "role"::text)), "companyId", "role"::text, 'Migrated legacy system role', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "users" GROUP BY "companyId", "role";
UPDATE "users" u SET "roleId" = concat('legacy_', md5(u."companyId" || u."role"::text));
ALTER TABLE "users" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "users" DROP COLUMN "role";
CREATE UNIQUE INDEX "roles_companyId_name_key" ON "roles"("companyId", "name");
CREATE INDEX "roles_companyId_idx" ON "roles"("companyId");
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");
CREATE UNIQUE INDEX "permissions_module_action_key" ON "permissions"("module", "action");
ALTER TABLE "roles" ADD CONSTRAINT "roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
