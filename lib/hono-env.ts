import type { Context } from "hono";

export type AppEnv = {
  Variables: {
    userId: string;
    validatedId: string;
  };
};

export type AppContext = Context<AppEnv>;
