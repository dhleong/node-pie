import { executeRequest } from "./exec";
import { clearScreen, readLines } from "./util";

async function runDaemon(stream: NodeJS.ReadStream) {
    for await (const line of readLines()) {
        const input = JSON.parse(line);
        if (!(input.file && input.line)) {
            throw new Error(`Invalid input: ${input}`);
        }

        clearScreen();
        executeRequest(input);
    }
}

export async function daemon() {
    await runDaemon(process.stdin);
}
