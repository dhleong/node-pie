import fs from "fs-extra";
import ohm from "ohm-js";
import path from "path";

import { EnvironmentDef, PieFile, ProcessorDef, RequestDef, Var } from "./ast";
import { ParseError } from "./parse-error";

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
                atSymbol,
                envId,
                _, // separator
                __, // comment
                defs,
            ) => {
                const evaluatedDefs = defs.evaluate();
                return new EnvironmentDef(
                    envId.evaluate(),
                    evaluatedDefs.filter((d: Var) => typeof d !== "string"),
                    createInterval(atSymbol, defs),
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
                createInterval(
                    name,
                    value,
                ),
            ),

            processorDef: (
                _,
                __,
                name,
                ___,
                openingBracket,
                statements,
                closingBracket,
            ) => new ProcessorDef(
                name.sourceString.trim(),
                statements.sourceString.trim(),
            ),

            processorPipe: (
                _,
                pipeLiteral,
                __,
                name,
            ) => name.sourceString.trim(),

            requestDef: (
                methodName,
                requestPath,
                processor,
                eol,
                headerDefs,
                body,
            ) => {
                const bodyMaybe = body.evaluate();
                const processorMaybe = processor.evaluate();

                return new RequestDef(
                    methodName.sourceString.trim(),
                    requestPath.evaluate(),
                    processorMaybe.length ? processorMaybe[0] : null,
                    bodyMaybe.length ? bodyMaybe[0] : null,
                    headerDefs.evaluate()[0] || [],
                    createInterval(methodName, body),
                );
            },

            requestHeaders: (
                headers,
                _,
            ) => {
                return headers.evaluate();
            },

            variableDef: (
                dollarSymbol,
                name,
                __,  // separator
                value,
                ___,  // comment
            ) => Var.variable(
                name.evaluate(),
                value.evaluate(),
                createInterval(dollarSymbol, value),
            ),

            requestBody: (lines, _) => {
                return lines.children.map(
                    (n: any) => n.evaluate(),
                ).join("\n").trim();
            },

            identifier: joinString,
            requestPath: joinString,
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

function createInterval(
    startNode: ohm.Node,
    endNode: ohm.Node = startNode,
) {
    return {
        start: startNode.source.startIdx,

        end: endNode.source.endIdx,
    };
}
