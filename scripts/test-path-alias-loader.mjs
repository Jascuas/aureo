import { access } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL, URL } from "node:url";

const extensions = [".ts", ".tsx"];

const resolveTypeScriptPath = async (pathWithoutExtension) => {
  const paths = extensions.flatMap((extension) => [
    `${pathWithoutExtension}${extension}`,
    resolvePath(pathWithoutExtension, `index${extension}`),
  ]);

  for (const path of paths) {

    try {
      await access(path);
      return pathToFileURL(path).href;
    } catch {
      // Try the next TypeScript file or index path.
    }
  }

  return undefined;
};

export const resolve = async (specifier, context, nextResolve) => {
  const url =
    specifier === "@/db/drizzle"
      ? pathToFileURL(resolvePath(process.cwd(), "scripts/test-db-stub.mjs")).href
      : specifier.startsWith("@/")
    ? await resolveTypeScriptPath(resolvePath(process.cwd(), specifier.slice(2)))
    : specifier.startsWith(".") && context.parentURL
      ? await resolveTypeScriptPath(
          resolvePath(fileURLToPath(new URL(specifier, context.parentURL))),
        )
      : undefined;

  if (url) {
    return { shortCircuit: true, url };
  }

  return nextResolve(specifier, context);
};
