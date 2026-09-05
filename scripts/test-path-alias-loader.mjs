import { access, readFile } from "node:fs/promises";
import { resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL, URL } from "node:url";

import typescript from "typescript";

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

export const load = async (url, context, nextLoad) => {
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    const source = await readFile(fileURLToPath(url), "utf8");
    const output = typescript.transpileModule(source, {
      compilerOptions: {
        jsx: typescript.JsxEmit.ReactJSX,
        module: typescript.ModuleKind.ESNext,
        target: typescript.ScriptTarget.ES2022,
      },
      fileName: fileURLToPath(url),
    });

    return { format: "module", shortCircuit: true, source: output.outputText };
  }

  return nextLoad(url, context);
};
