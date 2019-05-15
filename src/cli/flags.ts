import { Argv } from "yargs";
import { IExecuteFlags } from "./exec";

export const executeFlagDefaults: IExecuteFlags = {
    color: true,
    headers: true,
    raw: false,
};

export function withExecuteFlags<T>(
    args: Argv<T>,
) {
    return args.option("headers", {
        alias: "h",
        default: true,
        desc: "Include headers in the output",
        type: "boolean",
    }).option("color", {
        default: true,
        desc: "Colorize JSON responses",
        type: "boolean",
    }).option("raw", {
        default: false,
        desc: "Output the raw response info as JSON",
        type: "boolean",
    });
}
