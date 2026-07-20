/// <reference path="../../../types/passport-jwt.d.ts" />

import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { UserStatus } from "@prisma/client";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtPayload } from "../interfaces/jwt-payload.interface";
import { AuthRepository } from "../repositories/auth.repository";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private readonly authRepository: AuthRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authRepository.findById(payload.sub);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("User account is unavailable");
    }
    return user;
  }
}
