import { Injectable } from "@nestjs/common";
import { ActivityRepository } from "../repositories/activity.repository";
import { AppGateway } from "../../../core/gateway/app.gateway";

@Injectable()
export class ActivityService {
  constructor(
    private readonly repo: ActivityRepository,
    private readonly gateway: AppGateway,
  ) {}

  async log(companyId: string, userId: string, action: string, details: string) {
    const activity = await this.repo.create(companyId, userId, action, details);
    this.gateway.emitToCompany(companyId, 'new_activity', activity);
    return activity;
  }

  async findAll(companyId: string, limit?: number) {
    return this.repo.findMany(companyId, limit);
  }
}
