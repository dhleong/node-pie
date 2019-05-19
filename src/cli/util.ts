import fs from "fs-extra";
import colorizer from "json-colorizer";
import readline from "readline";

export function clearScreen() {
    // tslint:disable-next-line no-console
    console.clear();
}

export function println(...args: any[]) {
    // tslint:disable-next-line no-console
    console.log(...args);
}

export function colorize(json: any) {
    return colorizer(json, {
        pretty: true,

        colors: {
            STRING_LITERAL: "#fff",
        },
    });
}

// NOTE: yargs seems to give us an empty string instead
// if the `-`
export const isStdinFileValue = (value: string) =>
    value === "" || value === "-";

export const readFileValue = (file: string) => isStdinFileValue(file)
    ? readAllStdin()
    : fs.readFile(file);

export const readAllStdin = () => new Promise<Buffer>((resolve, reject) => {
    const buffers: Buffer[] = [];
    process.stdin.on("data", data => {
        buffers.push(data);
    });
    process.stdin.on("end", () => {
        resolve(Buffer.concat(buffers));
    });
    process.stdin.on("error", reject);
});

export async function* readLines() {
    const lines = readline.createInterface({
        input: process.stdin,
        terminal: false,
    });

    const nextLine = () => new Promise<string>(resolve => {
        lines.once("line", resolve);
    });

    try {
        while (true) {
            yield await nextLine();
        }
    } finally {
        // cleanup when the client stops consuming from this generator
        lines.close();
    }
}

/**
 * Start drawing a loading spinner
 *
 * @return a function that, when called, stops drawing the spinner
 */
export function startSpinner(message: string) {
    const steps = [
        "⠄", "⠆", "⠇", "⠋",
        "⠉",
        "⠈", "⠘", "⠸", "⠴",
        "⠤",
    ];

    let step = 0;
    const interval = setInterval(() => {
        clearScreen();

        const spinner = steps[step];
        step = (step + 1) % steps.length;
        println(`${spinner} ${message}`);
    }, 100);

    return () => clearInterval(interval);
}
