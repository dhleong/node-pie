import chalk from "Chalk";
import { ParseError } from "../parser";
import { executeRequest } from "./exec";
import { executeFlagDefaults } from "./flags";
import { clearScreen, println, readLines } from "./util";

async function runDaemon(stream: NodeJS.ReadStream) {
    for await (const line of readLines()) {
        const input = JSON.parse(line);
        if (!(input.file && input.line)) {
            throw new Error(`Invalid input: ${input}`);
        }

        clearScreen();

        try {
            const fullRequest = Object.assign({}, executeFlagDefaults, input);
            await executeRequest(fullRequest);
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
