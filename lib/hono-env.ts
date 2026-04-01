import type { Context } from "hono";

export type AppEnv = {
  Variables: {
    userId: string;
  };
};

export type AppContext = Context<AppEnv>;
