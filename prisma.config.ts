import "dotenv/config";
import { defineConfig, env } from "prisma/config";

const getDirectUrl = () => {
  if (process.env.DIRECT_URL) return process.env.DIRECT_URL;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.replace("-pooler.", ".");
  return undefined;
};

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: getDirectUrl() || env("DATABASE_URL"),
  },
});
