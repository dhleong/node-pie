
import { PieFile } from "../ast";
import { ParseError, Parser } from "../parser";
import { println, readFileValue } from "./util";

export interface ILintOpts {
    file: string;
}

export async function lint(
    opts: ILintOpts,
) {
    const contents = await readFileValue(opts.file);
    return lintContents(contents);
}

export async function lintContents(
    contents: Buffer | string,
) {
    const foundLint: ILint[] = [];

    for await (const lintItem of findLint(contents)) {
        foundLint.push(lintItem);
    }

    // print out any errors
    println(JSON.stringify(foundLint));

    // exit with an error code if we found anything
    if (foundLint.length) {
        process.exit(1);
    }
}

interface ILint {
    column: number;
    line: number;
    message: string;
    type: "error" | "warn";
}

export async function *findLint(
    contents: Buffer | string,
): AsyncIterable<ILint> {
    let file: PieFile;
    try {
        file = await new Parser().parse(contents.toString());
    } catch (e) {
        // if we error parsing the file, we can't lint it
        yield errorToLint(e);
        return;
    }

    for (const _ of file.entries) {
        // TODO linting
    }
}

function errorToLint(e: Error): ILint {
    if (e instanceof ParseError) {
        return {
            column: e.column,
            line: e.line,
            message: e.shortMessage || e.message,
            type: "error",
        };
    }

    return {
        column: 1,
        line: 1,
        message: e.message,
        type: "error",
    };
}
