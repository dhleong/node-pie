// tslint:disable no-console

import yargs from "yargs";

import { daemon } from "./daemon";
import { executeRequest } from "./exec";
import { withExecuteFlags } from "./flags";

const parser = yargs;

parser.option("validCommand", {
    default: true,
    hidden: true,
});

parser.command(
    "daemon", `Run in daemon mode`, args => {
        return args;
    }, daemon,
);

parser.command(
    "exec <file> <line>", `Execute a request`, args => {
        return withExecuteFlags(args).positional("file", {
            describe: "The file to parse; use - to read from stdin",
            type: "string",
        }).demand("file")
            .positional("line", {
                describe: "The line number of the request to execute",
                type: "number",
            }).demand("line");
    }, executeRequest,
);

parser.help()
    .strict()
    .demandCommand(1);

export async function main(args: any[]) {
    parser.parse(args.slice(2));
}
