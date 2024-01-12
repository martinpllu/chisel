import { writeFileSync } from "fs";
import path from "path";

export const writeFilesSpec = {
    name: "writeFiles",
    description:
        "Write content to multiple files inside the directory, creating each file if it does not exist.",
    parameters: {
        type: "object",
        properties: {
            relativePaths: {
                type: "array",
                items: {
                    type: "string",
                    description:
                        "The paths of the files to write to, relative to the root of the directory",
                },
            },
            contentsArray: {
                type: "array",
                items: {
                    type: "string",
                    description: "The contents of the files",
                },
            },
        },
        required: ["relativePaths", "contentsArray"],
    },
};

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
