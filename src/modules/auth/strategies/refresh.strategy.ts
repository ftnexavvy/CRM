/// <reference path="../../../types/passport-jwt.d.ts" />

import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtPayload } from "../interfaces/jwt-payload.interface";

@Injectable()
export class RefreshStrategy extends PassportStrategy(Strategy, "jwt-refresh") {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField("refreshToken"),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_REFRESH_SECRET") ?? configService.getOrThrow<string>("JWT_SECRET"),
    });
  }

  validate(payload: JwtPayload) {
    return payload;
  }
}
