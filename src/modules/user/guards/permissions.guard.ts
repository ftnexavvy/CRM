import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import { AuthUser } from "../../auth/interfaces/auth-repository.interface";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (!required.length) return true;
    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
    const granted = new Set(user?.role.permissions?.map((item) => item.permission.key) ?? []);
    if (required.every((permission) => granted.has(permission))) return true;
    throw new ForbiddenException("Permission denied");
  }
}
