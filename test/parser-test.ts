import * as chai from "chai";
import chaiSubset from "chai-subset";

import { AssertionError } from "chai";
import { EnvironmentDef, Var } from "../src/ast";
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
                    Var.header("Auth", "mreynolds"),
                    Var.variable("cargo", "geisha dolls"),
                ],
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

@serenity:  # serenity env
    # env settings
    Auth: mreynolds
    $type = "firefly"  # ship type

# REQUESTS
POST /cargo
{
    "key": "bobble-geisha"
}

        `);

        file.entries.should.containSubset([
            new EnvironmentDef(
                "serenity",
                [
                    Var.header("Auth", "mreynolds"),
                    Var.variable("type", "firefly"),
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
            Var.variable("cargo", '"totally legal" \\ awesome goods'),
        ]);
    });

    it("handles numeric variables", async () => {
        const file = await new Parser().parse(`$cargo = 42`);

        file.entries.should.containSubset([
            Var.variable("cargo", 42),
        ]);
    });

    it("provides helpful errors on variable syntax errors", async () => {
        const e = await exceptionOf(new Parser().parse(`$cargo = dolls`));
        e.should.have.property("message")
            .that.matches(/Expected .* string literal/);
    });
});
