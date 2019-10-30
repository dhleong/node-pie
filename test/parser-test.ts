import * as chai from "chai";
import chaiSubset from "chai-subset";

import { AssertionError } from "chai";
import { EnvironmentDef, RequestDef, Var, VarType } from "../src/ast";
import { Parser } from "../src/parser";

chai.use(chaiSubset);
chai.should();

async function exceptionOf(promise: Promise<any>): Promise<Error> {
    try {
        await promise;

        throw new AssertionError("Expected promise to reject");
    } catch (e) {
        if (e instanceof AssertionError) {
            throw e;
        }

        return e;
    }
}

function interval(start: number, end: number) {
    return { end, start };
}

function partialEnvironmentDef(
    name: string,
    vars: Array<Partial<Var>>,
) {
    const full = new EnvironmentDef(
        name,
        vars as Var[],
        interval(0, 0),
    );
    delete (full as any).interval;
    return full;
}

function header(name: string, value: string) {
    return { name, type: VarType.Header, value };
}

function variable(name: string, value: string | number) {
    return { name, type: VarType.Variable, value };
}

describe("Parser", () => {
    it("Should handle blank-line separated env defs", async () => {
        const file = await new Parser().parse(`

@serenity:
    Auth: mreynolds

    $cargo = "geisha dolls"

        `);

        file.entries.should.deep.equal([
            new EnvironmentDef(
                "serenity",
                [
                    Var.header("Auth", "mreynolds", interval(17, 32)),
                    Var.variable("cargo", "geisha dolls", interval(38, 61)),
                ],
                interval(2, 71),
            ),
        ]);
    });

    it("Should handle requests without bodies", async () => {
        const file = await new Parser().parse(`

GET /cargo

        `);

        file.entries.should.containSubset([
            { method: "GET", path: "/cargo" },
        ]);
    });

    it("Should handle request-specific headers", async () => {
        const file = await new Parser().parse(`

GET /cargo
Ship: serenity
Pilot: wash

GET /crew
        `);

        file.entries.should.containSubset([
            {
                method: "GET",
                path: "/cargo",

                headers: [
                    // Var.header("Ship", "serenity"),
                    // Var.header("Pilot", "wash"),
                ],
            },
        ]);

        (file.entries[1] as RequestDef).headers.should.be.empty;
    });

    it("Should handle requests with bodies", async () => {
        const file = await new Parser().parse(`

POST /cargo
{
    "key": "bobble-geisha"
}

        `);

        file.entries.should.containSubset([
            {
                method: "POST", path: "/cargo",

                body: `{
    "key": "bobble-geisha"
}`,
            },
        ]);
    });

    it("Should handle multiple requests", async () => {
        const file = await new Parser().parse(`

GET /cargo

POST /cargo
{
    "key": "bobble-geisha"
}

        `);

        file.entries.should.containSubset([
            { method: "GET", path: "/cargo" },
            {
                method: "POST", path: "/cargo",

                body: `{
    "key": "bobble-geisha"
}`,
            },
        ]);
    });

    it("Should ignore comments anywhere except values", async () => {
        const file = await new Parser().parse(`
# first line

@serenity:  # serenity env
    # env settings
    Auth: mreynolds
    $type = "firefly"  # ship type

# REQUESTS
POST /cargo
{
    "key": "bobble-geisha"
}

        `.trim());

        file.entries.should.containSubset([
            partialEnvironmentDef(
                "serenity",
                [
                    header("Auth", "mreynolds"),
                    variable("type", "firefly"),
                ],
            ),
            {
                method: "POST", path: "/cargo",

                body: `{
    "key": "bobble-geisha"
}`,
            },
        ]);
    });

    it("handles escaped chars in strings", async () => {
        const file = await new Parser().parse(`
$cargo = "\\"totally legal\\" \\\\ awesome goods"
        `);

        file.entries.should.containSubset([
            variable("cargo", '"totally legal" \\ awesome goods'),
        ]);
    });

    it("handles numeric variables", async () => {
        const file = await new Parser().parse(`$cargo = 42`);

        file.entries.should.containSubset([
            variable("cargo", 42),
        ]);
    });

    it("handles empty string variables", async () => {
        const file = await new Parser().parse(`$cargo = ""`);

        file.entries.should.containSubset([
            variable("cargo", ""),
        ]);
    });

    it("provides helpful errors on variable syntax errors", async () => {
        const e = await exceptionOf(new Parser().parse(`$cargo = dolls`));
        e.should.have.property("message")
            .that.matches(/Expected .* string literal/);
    });

    it("handles processors", async () => {
       const file = await new Parser().parse(`
GET /auth | authenticate

PROCESSOR authenticate \`\`\`
state.auth = json.rank.captain;
\`\`\`
       `);

       file.entries[0].should.have.property("processorName").that.equals("authenticate");

       file.entries[1].should.have.property("name").that.equals("authenticate");
       file.entries[1].should.have.property("source").that.equals(`
           state.auth = json.rank.captain;
       `.trim());
    });
});
