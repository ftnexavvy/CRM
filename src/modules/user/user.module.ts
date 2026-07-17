import { Module } from "@nestjs/common";
import { UserController } from "./controllers/user.controller";
import { UserRepository } from "./repositories/user.repository";
import { UserService } from "./services/user.service";
import { RoleRepository } from "../role/repositories/role.repository";
import { RoleService } from "../role/services/role.service";
import { RoleController } from "../role/controllers/role.controller";
import { PermissionRepository } from "../permission/repositories/permission.repository";
import { PermissionService } from "../permission/services/permission.service";
import { PermissionController } from "../permission/controllers/permission.controller";
import { PermissionsGuard } from "./guards/permissions.guard";

@Module({ controllers: [UserController, RoleController, PermissionController], providers: [UserService, UserRepository, RoleService, RoleRepository, PermissionService, PermissionRepository, PermissionsGuard], exports: [PermissionsGuard] })
export class UserModule {}
