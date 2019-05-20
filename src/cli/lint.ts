
import { PieFile, RequestDef } from "../ast";
import { RequestContext } from "../context";
import { LineTracker } from "../line-tracker";
import { ILint } from "../lint/model";
import { detectUndefinedVars } from "../lint/undefined-vars";
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
    const foundSet: { [key: number]: Set<string> } = {};

    for await (const lintItem of findLint(contents)) {
        if (
            foundSet[lintItem.line] && foundSet[lintItem.line].has(lintItem.message)
        ) {
            // dup
            continue;
        }

        foundLint.push(lintItem);
    }

    // print out any errors
    println(JSON.stringify(foundLint));

    // exit with an error code if we found anything
    if (foundLint.length) {
        process.exit(1);
    }
}

export async function *findLint(
    contents: Buffer | string,
): AsyncIterable<ILint> {
    const stringContents = contents.toString();

    let file: PieFile;
    try {
        file = await new Parser().parse(stringContents);
    } catch (e) {
        // if we error parsing the file, we can't lint it
        yield errorToLint(e);
        return;
    }

    const lines = new LineTracker(stringContents);

    for (const e of file.entries) {
        if (!(e instanceof RequestDef)) {
            continue;
        }

        const [ start ] = lines.lineRange(e.interval);
        const request = RequestContext.create(file, start);
        if (!request.hasRequest) {
            yield {
                column: 1,
                line: start,
                message: "Invalid request",
                type: "error",
            };
        }

        yield *lintRequestContext(request);
    }
}

function *lintRequestContext(context: RequestContext): Iterable<ILint> {
    // lint detection routines go here:
    yield *detectUndefinedVars(context);
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
