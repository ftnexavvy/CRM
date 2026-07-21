import { Module } from "@nestjs/common";
import { DepartmentController } from "./controllers/department.controller";
import { WorkflowController } from "./controllers/workflow.controller";
import { TaskController } from "./controllers/task.controller";
import { WorkflowRepository } from "./repositories/workflow.repository";
import { DepartmentService } from "./services/department.service";
import { WorkflowService } from "./services/workflow.service";
import { TaskService } from "./services/task.service";
import { PermissionsGuard } from "../user/guards/permissions.guard";

@Module({ controllers: [WorkflowController, DepartmentController, TaskController], providers: [WorkflowService, DepartmentService, TaskService, WorkflowRepository, PermissionsGuard], exports: [WorkflowService] })
export class WorkflowModule {}
