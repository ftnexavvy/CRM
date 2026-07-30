import { Injectable } from "@nestjs/common";
import { ActivityRepository } from "../repositories/activity.repository";

@Injectable()
export class ActivityService {
  constructor(private readonly repo: ActivityRepository) {}

  async log(companyId: string, userId: string, action: string, details: string) {
    return this.repo.create(companyId, userId, action, details);
  }

  async findAll(companyId: string, limit?: number) {
    return this.repo.findMany(companyId, limit);
  }
}
