// tslint:disable no-console

import yargs from "yargs";

import { daemon } from "./daemon";
import { executeRequest } from "./exec";
import { withExecuteFlags, withFile } from "./flags";
import { lint } from "./lint";

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
        return withFile(withExecuteFlags(args))
            .positional("line", {
                describe: "The line number of the request to execute",
                type: "number",
            }).demand("line");
    }, executeRequest,
);

parser.command(
    "lint <file>", `Check a file for problems`, args => {
        return withFile(args);
    }, lint,
);

parser.help()
    .strict()
    .demandCommand(1);

export async function main(args: any[]) {
    parser.parse(args.slice(2));
}
