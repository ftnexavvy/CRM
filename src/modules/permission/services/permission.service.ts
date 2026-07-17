import { Injectable } from "@nestjs/common";
import { PermissionRepository } from "../repositories/permission.repository";
@Injectable() export class PermissionService { constructor(private readonly permissions: PermissionRepository) {} findAll() { return this.permissions.findMany(); } }
