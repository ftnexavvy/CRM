import { ExecutionContext, createParamDecorator } from "@nestjs/common";
import { AuthUser } from "../interfaces/auth-repository.interface";

export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthUser =>
  context.switchToHttp().getRequest().user as AuthUser,
);
