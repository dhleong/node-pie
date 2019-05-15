import { Argv } from "yargs";
import { IExecuteFlags } from "./exec";

export const executeFlagDefaults: IExecuteFlags = {
    color: true,
    headers: true,
    raw: false,
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
    }).option("raw", {
        default: executeFlagDefaults.raw,
        desc: "Output the raw response info as JSON",
        type: "boolean",
    }).option("status", {
        default: executeFlagDefaults.status,
        desc: "Include status line in output",
        type: "boolean",
    });
}
