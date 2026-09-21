import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

type Database = ReturnType<typeof drizzle>;

let database: Database | undefined;

const getDatabaseUrl = (): string => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for database operations");
  }

  return databaseUrl;
};

const getDatabase = (): Database => {
  database ??= drizzle(neon(getDatabaseUrl()));

  return database;
};

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const resolvedDatabase = getDatabase();
    const databaseMember = Reflect.get(resolvedDatabase, property, resolvedDatabase);

    return typeof databaseMember === "function"
      ? databaseMember.bind(resolvedDatabase)
      : databaseMember;
  },
});
