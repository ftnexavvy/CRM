declare module "passport-jwt" {
  export const ExtractJwt: {
    fromAuthHeaderAsBearerToken(): unknown;
    fromBodyField(fieldName: string): unknown;
  };

  export class Strategy {
    constructor(options: unknown, verify?: (...args: unknown[]) => unknown);
  }
}
