import * as dotenv from "dotenv";
import { existsSync } from "fs";
import OpenAI from "openai";
import { ChatCompletionMessageParam } from "openai/resources";
import ora from "ora";
import path from "path";
import promptSync from "prompt-sync";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { readFiles, readFilesSpec } from "./read-files";
import { writeFiles, writeFilesSpec } from "./write-files";

const prompt = promptSync({ sigint: true });
dotenv.config();

const spinner = ora("ChatGPT");
process.on("SIGINT", () => {
    spinner.stop();
    console.log("\nOperation interrupted by the user.");
    process.exit(1);
});

const options = yargs(hideBin(process.argv))
    .options({
        directory: {
            alias: ["d", "dir"],
            type: "string",
            describe: `The directory containing the code`,
        },
        ignorePaths: {
            type: "array",
            describe:
                "Paths to ignore. You can specify multiple, e.g. --ignorePaths 'path/to/ignore1' --ignorePaths 'path/to/ignore2'",
            default: [],
        },
        logFullResponses: {
            type: "boolean",
            describe: "Log the full ChatGPT response object",
        },
    })
    .demandOption(["directory"])
    .strict()
    .parseSync();

const dir = options.directory as string;
const ignorePaths = (options.ignorePaths as string[]) || [];
const logFullResponses = options.logFullResponses as boolean;

if (!existsSync(dir)) {
    console.error(`Directory ${dir} does not exist`);
    process.exit(1);
}
const absoluteDir = path.resolve(dir);

const openai = new OpenAI({
    apiKey: process.env["OPENAI_API_KEY"] as string,
});

const conversationHistory: ChatCompletionMessageParam[] = [];

async function getResponse(prompt: ChatCompletionMessageParam) {
    const response = await submitPrompt(prompt);
    const responseMessage = response.choices[0].message;
    if (responseMessage.function_call?.name === readFiles.name) {
        const result = await readFiles(absoluteDir, ignorePaths);
        await submitPrompt({
            role: "function",
            name: "readFiles",
            content: result,
        });
    } else if (responseMessage.function_call?.name === writeFiles.name) {
        const args = JSON.parse(responseMessage.function_call.arguments);
        writeFiles(absoluteDir, args.relativePaths, args.contentsArray);
        await submitPrompt({
            role: "function",
            name: "writeFiles",
            content: "Done",
        });
        console.log(`Writing ${args.relativePaths}`);
    } else {
        conversationHistory.push({
            role: "assistant",
            content: responseMessage.content,
        });
    }
}

async function submitPrompt(prompt: ChatCompletionMessageParam) {
    conversationHistory.push(prompt);
    spinner.start();
    const response = await openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: conversationHistory,
        functions: [readFilesSpec, writeFilesSpec],
    });
    spinner.stop();
    const totalTokens = response.usage?.total_tokens;
    console.log(`[${totalTokens} tokens]`);
    if (logFullResponses) {
        console.log("", JSON.stringify(response, null, 2), "");
    }
    const responseMessage = response.choices[0].message;
    if (responseMessage.content) {
        console.log();
        console.log("ChatGPT:", responseMessage.content);
    }
    return response;
}

async function chat() {
    console.log();
    const content = prompt("You: ");
    await getResponse({
        role: "user",
        content,
    });
    await chat();
}

const systemPrompts = [
    `Start by reading the contents of all files in the directory.`,
    `Never output code changes to the console. Always write to files instead.`,
    `Always write the whole file contents, not just the changes.`,
    `Don't suggest any changes after you read the files for the first time.`,
];

(async () => {
    await getResponse({
        role: "system",
        content: systemPrompts.join("\n"),
    });
    await chat();
})();
