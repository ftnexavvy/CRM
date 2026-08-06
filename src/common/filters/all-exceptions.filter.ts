import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const resBody =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: (exception as any)?.message || "Internal server error" };

    this.logger.error(
      `🚨 [${request.method}] ${request.url} - Status ${status} - Details: ${JSON.stringify(resBody)}`,
      (exception as any)?.stack
    );

    response.status(status).json(resBody);
  }
}
