import chalk from "chalk";

import { Engine, IResponse } from "../engine";
import { colorize, println, readFileValue } from "./util";

export interface IExecuteFlags {
    color: boolean;
    headers: boolean;
    raw: boolean;
    status: boolean;
}

export interface IExecuteOpts extends IExecuteFlags {
    file: string;
    line: number;
}

export interface IExecuteLifecycle {
    onError?(): void;
    onResponseReceived?(): void;
}

export async function executeRequest(
    opts: IExecuteOpts,
    lifecycle: IExecuteLifecycle = {},
) {
    const contents = await readFileValue(opts.file);
    return executeOnContents(contents, opts.line, opts, lifecycle);
}

export async function executeOnContents(
    contents: Buffer | string,
    line: number,
    opts: IExecuteFlags,
    lifecycle: IExecuteLifecycle = {},
) {
    const oldChalkLevel = chalk.level;
    if (!opts.color) {
        chalk.level = 0;
    }

    const engine = await Engine.fromString(contents.toString());

    try {
        const response = await engine.performRequestAt(line);

        trigger(lifecycle, "onResponseReceived");

        formatResponse(opts, response);
    } catch (e) {
        trigger(lifecycle, "onError");

        formatError(e);
    } finally {
        chalk.level = oldChalkLevel;
    }
}

function formatHeader(
    name: string,
    value: string | string[],
) {
    const v = typeof value === "string"
        ? chalk`{hex("#fff") ${value}}`
        : value.map(part => chalk`\`{hex("#fff") ${part}}\``)
            .join(chalk` {gray ,} `);
    return chalk`{cyan ${name}}{white :} ${v}`;
}

function formatResponse(opts: IExecuteFlags, response: IResponse) {
    const doColorJson = opts.color
        ? colorize
        : (v: any) => JSON.stringify(v, null, 2);

    if (opts.raw) {
        println(doColorJson(response));
        return;
    }

    if (opts.status) {
        const color = pickStatusColor(response.statusCode);
        println(
            chalk`{${color} HTTP}/{${color} ${`${response.httpVersion} ${response.statusCode}`}}` +
            chalk` {cyan ${response.statusMessage}}`,
        );
    }

    if (opts.headers) {
        for (const [h, v] of Object.entries(response.headers)) {
            if (!v) continue;
            println(formatHeader(h, v));
        }
    }

    if (response.bodyJson) {
        println();
        println(doColorJson(response.bodyJson));
        return;
    }

    if ((response.body as Buffer).includes("\u0000")) {
        const lengthInfo = response.body && response.body.length
            ? chalk` {gray (} {blue ${response.body.length} bytes} {gray )}`
            : "";

        println(chalk`
{white.bold [} {white binary data not printed}${lengthInfo} {white.bold ]}
`);
        return;
    }

    // fallback
    println();
    println(response.body);
}

function formatError(e: Error) {
    println(chalk`{red Error performing request}:`);
    println();
    println(e.stack || e.message);
}

function pickStatusColor(statusCode: number) {
    if (statusCode < 300) return "blueBright";
    if (statusCode < 500) return "red";
    return "gray";
}

function trigger(
    lifecycle: IExecuteLifecycle,
    event: keyof IExecuteLifecycle,
) {
    const handler = lifecycle[event];
    if (handler) handler();
}
