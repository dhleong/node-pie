import colorizer from "json-colorizer";
import readline from "readline";

export function clearScreen() {
    // tslint:disable-next-line no-console
    console.clear();
}

export function colorize(json: any) {
    return colorizer(json, {
        pretty: true,

        colors: {
            STRING_LITERAL: "#fff",
        },
    });
}

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
