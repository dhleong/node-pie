import chalk from "chalk";
import fs from "fs-extra";

import { Engine, IResponse } from "../engine";
import { colorize, println } from "./util";

export interface IExecuteFlags {
    color: boolean;
    headers: boolean;
    raw: boolean;
}

export interface IExecuteOpts extends IExecuteFlags {
    file: string;
    line: number;
}

export async function executeRequest(
    opts: IExecuteOpts,
) {
    const contents = await fs.readFile(opts.file);
    const engine = await Engine.fromString(contents.toString());
    const response = await engine.performRequestAt(opts.line);

    const oldChalkLevel = chalk.level;
    if (!opts.color) {
        chalk.level = 0;
    }

    try {
        formatResponse(opts, response);
    } finally {
        chalk.level = oldChalkLevel;
    }
}

function formatHeader(
    name: string,
    value: string | string[],
) {
    const v = typeof value === "string"
        ? value
        : value.join(", ");
    return chalk`{cyan ${name}}{white :} {hex("#fff") ${v}}`;
}

function formatResponse(opts: IExecuteOpts, response: IResponse) {
    const doColorJson = opts.color
        ? colorize
        : (v: any) => JSON.stringify(v, null, 2);

    if (opts.raw) {
        println(doColorJson(response));
        return;
    }

    println(chalk`{blueBright ${response.statusCode.toString()}} {cyan ${response.statusMessage}}`);

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
    println(response.body);
}
