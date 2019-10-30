import { Argv } from "yargs";
import { IExecuteFlags } from "./exec";

export const executeFlagDefaults: IExecuteFlags = {
    color: true,
    headers: true,
    oob: false,
    raw: false,
    spinner: false,
    status: true,
};

export function withExecuteFlags<T>(
    args: Argv<T>,
) {
    return args.option("headers", {
        default: executeFlagDefaults.headers,
        desc: "Include headers in the output",
        type: "boolean",
    }).option("color", {
        default: executeFlagDefaults.color,
        desc: "Colorize JSON responses",
        type: "boolean",
    }).option("oob", {
        default: executeFlagDefaults.oob,
        desc: "Output out-of-band messages to stderr",
        type: "boolean",
    }).option("raw", {
        default: executeFlagDefaults.raw,
        desc: "Output the raw response info as JSON",
        type: "boolean",
    }).option("status", {
        default: executeFlagDefaults.status,
        desc: "Include status line in output",
        type: "boolean",
    }).option("spinner", {
        default: false,
        desc: "Show a spinner while the request runs",
        type: "boolean",
    });
}

export function withFile<T>(
    args: Argv<T>,
) {
    return args.positional("file", {
        describe: "The file to parse; use - to read from stdin",
        type: "string",
    }).demand("file");
}
