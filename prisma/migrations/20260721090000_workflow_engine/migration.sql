CREATE TYPE "WorkflowStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'REVIEW', 'REVISION', 'APPROVED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'TRANSFERRED', 'RETURNED', 'CANCELLED');
CREATE TYPE "WorkflowEventType" AS ENUM ('CREATED', 'ASSIGNED', 'ACCEPTED', 'STARTED', 'COMPLETED', 'TRANSFERRED', 'RETURNED', 'APPROVED', 'REJECTED', 'CANCELLED', 'TASKS_GENERATED', 'OVERRIDDEN');
CREATE TYPE "TaskType" AS ENUM ('GENERIC', 'GRAPHIC', 'REEL', 'POST', 'VIDEO', 'CONTENT');

CREATE TABLE "departments" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "name" TEXT NOT NULL, "code" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "workflows" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "subjectType" TEXT NOT NULL, "subjectId" TEXT NOT NULL,
  "title" TEXT NOT NULL, "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING', "currentStageKey" TEXT,
  "currentDepartmentId" TEXT, "version" INTEGER NOT NULL DEFAULT 1, "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3), "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "workflow_assignments" (
  "id" TEXT NOT NULL, "workflowId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "departmentId" TEXT NOT NULL,
  "assignedById" TEXT NOT NULL, "assignedToId" TEXT NOT NULL, "remarks" TEXT,
  "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED', "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3), "closedAt" TIMESTAMP(3),
  CONSTRAINT "workflow_assignments_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "workflow_history" (
  "id" TEXT NOT NULL, "workflowId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "eventType" "WorkflowEventType" NOT NULL,
  "actorId" TEXT NOT NULL, "fromStatus" "WorkflowStatus", "toStatus" "WorkflowStatus", "fromUserId" TEXT,
  "toUserId" TEXT, "departmentId" TEXT, "remarks" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflow_history_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "tasks" (
  "id" TEXT NOT NULL, "workflowId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "title" TEXT NOT NULL,
  "type" "TaskType" NOT NULL DEFAULT 'GENERIC', "status" "WorkflowStatus" NOT NULL DEFAULT 'PENDING',
  "assignedToId" TEXT, "createdById" TEXT NOT NULL, "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "task_comments" (
  "id" TEXT NOT NULL, "taskId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "authorId" TEXT NOT NULL,
  "content" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "task_attachments" (
  "id" TEXT NOT NULL, "taskId" TEXT NOT NULL, "companyId" TEXT NOT NULL, "uploadedById" TEXT NOT NULL,
  "fileName" TEXT NOT NULL, "fileUrl" TEXT NOT NULL, "mimeType" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "departments_companyId_name_key" ON "departments"("companyId", "name");
CREATE UNIQUE INDEX "departments_companyId_code_key" ON "departments"("companyId", "code");
CREATE INDEX "departments_companyId_isActive_idx" ON "departments"("companyId", "isActive");
CREATE UNIQUE INDEX "workflows_companyId_subjectType_subjectId_key" ON "workflows"("companyId", "subjectType", "subjectId");
CREATE INDEX "workflows_companyId_status_currentDepartmentId_idx" ON "workflows"("companyId", "status", "currentDepartmentId");
CREATE INDEX "workflow_assignments_companyId_assignedToId_status_assignedAt_idx" ON "workflow_assignments"("companyId", "assignedToId", "status", "assignedAt");
CREATE INDEX "workflow_assignments_workflowId_assignedAt_idx" ON "workflow_assignments"("workflowId", "assignedAt");
CREATE INDEX "workflow_history_workflowId_createdAt_idx" ON "workflow_history"("workflowId", "createdAt");
CREATE INDEX "workflow_history_companyId_actorId_createdAt_idx" ON "workflow_history"("companyId", "actorId", "createdAt");
CREATE INDEX "tasks_companyId_assignedToId_status_idx" ON "tasks"("companyId", "assignedToId", "status");
CREATE INDEX "tasks_workflowId_status_idx" ON "tasks"("workflowId", "status");
CREATE INDEX "task_comments_taskId_createdAt_idx" ON "task_comments"("taskId", "createdAt");
CREATE INDEX "task_attachments_taskId_createdAt_idx" ON "task_attachments"("taskId", "createdAt");

ALTER TABLE "departments" ADD CONSTRAINT "departments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_assignments" ADD CONSTRAINT "workflow_assignments_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
