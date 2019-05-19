import fs from "fs-extra";
import ohm from "ohm-js";
import path from "path";

import { EnvironmentDef, PieFile, RequestDef, Var } from "./ast";

function joinString(node: ohm.Node) {
    return node.children.map(c =>
        c.sourceString,
    ).join("");
}

function parseEscapeChar(c: string) {
    switch (c) {
    case "\\":
    case "\"":
        return c;

    default:
        throw new Error(`Unsupported escape character ${c}`);
    }
}

export class ParseError extends Error {

    public readonly line: number;
    public readonly column: number;

    public readonly shortMessage?: string;

    constructor(match: ohm.MatchResult | string) {
        super(typeof match === "string" ? match : match.message);

        if (typeof match === "string") {
            // TODO ?
            this.line = 0;
            this.column = 0;
        } else {
            // this is gross:
            const interval: ohm.Interval = (match as any).getInterval();
            const msg = interval.getLineAndColumnMessage();
            const m = msg.match(/ (\d+), col (\d+)/);
            if (!m) throw new Error("Unexpected line and column message");

            this.line = parseInt(m[1], 10);
            this.column = parseInt(m[2], 10);
            this.shortMessage = match.shortMessage;
        }
    }
}

export class Parser {
    private grammar: ohm.Grammar | undefined;
    private semantics: ohm.Semantics | undefined;

    public async parse(fileContents: string) {
        const [g, s] = await this.ensureGrammar();
        const match = g.match(fileContents);
        if (!match.succeeded()) {
            throw new ParseError(match);
        }

        const topLevels = s(match).evaluate();
        return new PieFile(
            fileContents,
            topLevels.filter((it: any) => typeof it !== "string"),
        );
    }

    private async ensureGrammar(): Promise<[ohm.Grammar, ohm.Semantics]> {
        if (this.grammar) return [this.grammar, this.semantics!];

        const file = await fs.readFile(
            path.join(__dirname, "..", "grammar.ohm"),
        );
        const g = this.grammar = ohm.grammar(file.toString());

        const s = this.semantics = g.createSemantics().addOperation("evaluate", {
            environmentSpec: (
                _,
                envId,
                __, // separator
                ___, // comment
                defs,
            ) => {
                const evaluatedDefs = defs.evaluate();
                return new EnvironmentDef(
                    envId.evaluate(),
                    evaluatedDefs.filter((d: Var) => typeof d !== "string"),
                );
            },

            inEnvDef: (
                _,
                __,
                def,
            ) => def.evaluate(),

            headerDef: (
                name,
                __,
                value,
            ) => Var.header(
                name.evaluate(),
                value.evaluate(),
            ),

            requestDef: (
                methodName,
                requestPath,
                eol,
                headerDefs,
                body,
            ) => {
                const bodyMaybe = body.evaluate();

                return new RequestDef(
                    methodName.sourceString.trim(),
                    requestPath.evaluate(),
                    bodyMaybe.length ? bodyMaybe[0] : null,
                    headerDefs.evaluate()[0] || [],
                    {
                        start: methodName.source.startIdx,

                        end: body.source.endIdx,
                    },
                );
            },

            requestHeaders: (
                headers,
                _,
            ) => {
                return headers.evaluate();
            },

            variableDef: (
                _,  // "$"
                name,
                __,  // separator
                value,
                ___,  // comment
            ) => Var.variable(
                name.evaluate(),
                value.evaluate(),
            ),

            requestBody: (lines, _) => {
                return lines.children.map(
                    (n: any) => n.evaluate(),
                ).join("\n").trim();
            },

            identifier: joinString,
            value: joinString,

            comment: (_, __, ___) => "",

            numberValue: value => parseInt(joinString(value), 10),
            stringValue: (_, value, __) => value.sourceString.replace(
                /\\(.)/g,
                (whole, c) => parseEscapeChar(c),
            ),

            blankLine: (_, __, ___) => "",
            emptyLine: (_, __, ___) => "",
            eol: _ => "\n",
            eos: _ => "\n",
        });

        return [g, s];
    }
}
