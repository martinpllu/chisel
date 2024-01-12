import { readdir, readFile } from "fs/promises";
import path from "path";

const DEFAULT_IGNORE_PATHS = [
    `\\.git`,
    `\\.idea`,
    `\\.vscode`,
    `\\.DS_Store`,
    `\\.env*`,
    `dist`,
    `build`,
    `out`,
    `node_modules`,
    `pnpm-lock\\.yaml`,
    `package-lock\\.json`,
    `\\.(jpg|jpeg|png|gif|ico)$`,
];

export const readFilesSpec = {
    name: readFiles.name,
    description:
        "Read the contents of all files in the directory, apart from 'ignored' files like node_modules",
    parameters: {},
};

export async function readFiles(
    absoluteDir: string,
    ignorePaths: string[] = []
) {
    console.log(`Reading contents of directory ${absoluteDir}...`);
    const allIgnorePaths = [...DEFAULT_IGNORE_PATHS, ...ignorePaths];
    const files = await getFilesRecursive(absoluteDir, allIgnorePaths);
    let combinedContent = "";
    for (const file of files) {
        combinedContent += (await readFile(file, "utf8")) + "\n";
    }
    return combinedContent;
}

async function getFilesRecursive(
    dir: string,
    ignorePatterns: string[]
): Promise<string[]> {
    let results: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.resolve(dir, entry.name);
        if (entry.isDirectory()) {
            results = [
                ...results,
                ...(await getFilesRecursive(fullPath, ignorePatterns)),
            ];
        } else if (!isIgnored(fullPath, ignorePatterns)) {
            results.push(fullPath);
        }
    }
    return results;
}

function isIgnored(filePath: string, ignorePatterns: string[]) {
    return ignorePatterns.some((pattern) => new RegExp(pattern).test(filePath));
}
