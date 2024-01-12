import { writeFileSync } from "fs";
import path from "path";

export function writeFiles(
    absoluteDir: string,
    relativePaths: string[],
    contentsArray: string[]
) {
    if (relativePaths.length !== contentsArray.length) {
        throw new Error("The number of paths and contents must be equal");
    }
    for (let i = 0; i < relativePaths.length; i++) {
        const fullPath = path.resolve(absoluteDir, relativePaths[i]);
        if (!fullPath.startsWith(absoluteDir)) {
            throw new Error(
                "One of the paths is outside the directory: " + fullPath
            );
        }
        writeFileSync(fullPath, contentsArray[i]);
    }
}
