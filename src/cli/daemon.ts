import chalk from "Chalk";
import { ParseError } from "../parser";
import { executeOnContents, executeRequest } from "./exec";
import { executeFlagDefaults } from "./flags";
import { clearScreen, println, readLines } from "./util";

type DaemonCommand = () => void;

/*
 * Daemon implementation
 */

async function runDaemon(stream: NodeJS.ReadStream) {
    for await (const line of readLines()) {
        const command = extractCommand(JSON.parse(line));

        clearScreen();

        try {
            await command();
        } catch (e) {
            if (e instanceof ParseError) {
                // TODO better coloring?
                println(chalk.red(e.message));
            } else {
                // unrecoverable (?)
                throw e;
            }
        }
    }
}

export async function daemon() {
    await runDaemon(process.stdin);
}

/*
 * Command types
 */

interface ISimpleExec {
    file: string;
    line: number;
}

function isSimpleExec(json: any): json is ISimpleExec {
    if (json.file === "" || json.file === "-") {
        // this is used to indicate stdin, which is
        // not compatible with daemon mode
        throw new Error("Invalid file name: -");
    }

    return typeof json.file === "string"
        && typeof json.line === "number";
}

interface IFullExec {
    lines?: string[];
    content?: string;
    line: number;
}

function isFullExec(json: any): json is IFullExec {
    if (typeof json.line !== "number") return false;
    return typeof json.content === "string"
        || Array.isArray(json.lines);
}

/*
 * Command extraction
 */

function extractCommand(json: unknown): DaemonCommand {
    if (typeof json === "object" && json) {
        if (isSimpleExec(json)) {
            return async () => {
                const fullRequest = fillRequest(json);
                await executeRequest(fullRequest);
            };
        }

        if (isFullExec(json)) {
            return async () => {
                const flags = fillRequest(json);
                await executeOnContents(
                    json.content || json.lines!.join("\n"),
                    json.line,
                    flags,
                );
            };
        }
    }

    throw new Error(`Invalid input: ${json}`);
}

/*
 * Util
 */

function fillRequest<T>(json: T) {
    return Object.assign({}, executeFlagDefaults, json);
}
