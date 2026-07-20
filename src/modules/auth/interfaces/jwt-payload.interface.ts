/** Claims embedded in access and refresh tokens for a tenant-scoped user. */
export interface JwtPayload {
  sub: string;
  email: string;
  roleId: string;
  companyId: string;
}
