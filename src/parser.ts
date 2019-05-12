import fs from "fs-extra";
import ohm from "ohm-js";
import path from "path";

import { EnvironmentDef, PieFile, RequestDef, Var } from "./ast";

function joinString(node: ohm.Node) {
    return node.children.map(c =>
        c.sourceString,
    ).join("");
}

export class Parser {
    private grammar: ohm.Grammar | undefined;
    private semantics: ohm.Semantics | undefined;

    public async parse(fileContents: string) {
        const [g, s] = await this.ensureGrammar();
        const match = g.match(fileContents);
        if (!match.succeeded()) {
            throw new Error(match.message);
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
                __,
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
                    {
                        start: methodName.source.startIdx,

                        end: body.source.endIdx,
                    },
                );
            },

            variableDef: (
                _,
                name,
                __,
                value,
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

            blankLine: (_, __) => "",
            emptyLine: (_, __, ___) => "",
            eol: _ => "\n",
            eos: _ => "\n",
        });

        return [g, s];
    }
}
