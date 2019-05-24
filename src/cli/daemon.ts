import chalk from "Chalk";
import { ParseError } from "../parse-error";
import { executeOnContents, executeRequest, IExecuteLifecycle } from "./exec";
import { executeFlagDefaults } from "./flags";
import { clearScreen, isStdinFileValue, println, readLines, startSpinner } from "./util";

type DaemonCommand = () => void;

/*
 * Daemon implementation
 */

async function runDaemon(stream: NodeJS.ReadStream) {
    for await (const line of readLines()) {
        clearScreen();

        const stopSpinner = startSpinner("Fetching...");

        let json: any;
        try {
            json = JSON.parse(line);
        } catch (e) {
            throw new Error(`Error parsing:\n\n${line}\n\nStack:${e.stack}`);
        }

        const command = extractCommand(json, {
            onError() {
                stopSpinner();
                clearScreen();
            },

            onResponseReceived() {
                stopSpinner();
                clearScreen();
            },
        });

        try {
            await command();
        } catch (e) {
            stopSpinner();

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
    if (isStdinFileValue(json.file)) {
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

function extractCommand(
    json: unknown,
    lifecycle: IExecuteLifecycle,
): DaemonCommand {
    if (typeof json === "object" && json) {
        if (isSimpleExec(json)) {
            return async () => {
                const fullRequest = fillRequest(json);
                await executeRequest(fullRequest, lifecycle);
            };
        }

        if (isFullExec(json)) {
            const contents = json.content || json.lines!.join("\n");
            return async () => {
                const flags = fillRequest(json);
                await executeOnContents(
                    contents,
                    json.line,
                    flags,
                    lifecycle,
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
