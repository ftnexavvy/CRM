import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JustdialSecretGuard implements CanActivate {
  private readonly logger = new Logger(JustdialSecretGuard.name);
  private ipRequestCounts = new Map<string, { count: number; expiresAt: number }>();
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  private readonly RATE_LIMIT_MAX = 60; // max 60 requests per minute

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.headers["x-forwarded-for"] || "unknown";

    // 1. Rate Limiting Check
    const now = Date.now();
    const rateData = this.ipRequestCounts.get(ip);

    if (rateData && rateData.expiresAt > now) {
      if (rateData.count >= this.RATE_LIMIT_MAX) {
        this.logger.warn(`Rate limit exceeded for IP: ${ip}`);
        throw new HttpException("Too many requests. Please try again later.", HttpStatus.TOO_MANY_REQUESTS);
      }
      rateData.count++;
    } else {
      this.ipRequestCounts.set(ip, { count: 1, expiresAt: now + this.RATE_LIMIT_WINDOW_MS });
    }

    // Periodically clean stale IP cache
    if (this.ipRequestCounts.size > 1000) {
      for (const [k, v] of this.ipRequestCounts.entries()) {
        if (v.expiresAt <= now) this.ipRequestCounts.delete(k);
      }
    }

    // 2. Secret / API Key Validation (Optional)
    const expectedSecret = this.configService.get<string>("JUSTDIAL_API_SECRET");
    if (expectedSecret && expectedSecret.trim().length > 0) {
      const incomingSecret =
        request.headers["x-justdial-secret"] ||
        request.headers["x-api-key"] ||
        request.headers["authorization"] ||
        request.query?.secret;

      const cleanIncoming = typeof incomingSecret === "string" ? incomingSecret.replace(/^Bearer\s+/i, "").trim() : "";

      if (cleanIncoming !== expectedSecret.trim()) {
        this.logger.warn(`Unauthorized Justdial access attempt from IP: ${ip}`);
        throw new UnauthorizedException("Invalid Justdial API secret key");
      }
    }

    return true;
  }
}
