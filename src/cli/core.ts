// tslint:disable no-console

import yargs from "yargs";

import { executeRequest } from "./exec";

const parser = yargs;

parser.option("validCommand", {
    default: true,
    hidden: true,
});

parser.command(
    "exec <file> <line>", `Execute a request`, args => {
        return args.positional("file", {
            describe: "The file to parse",
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
