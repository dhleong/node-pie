import * as chai from "chai";
import chaiSubset from "chai-subset";

import { EnvironmentDef, Var } from "../src/ast";
import { Parser } from "../src/parser";

chai.use(chaiSubset);
chai.should();

describe("Parser", () => {
    it("Should handle blank-line separated env defs", async () => {
        const file = await new Parser().parse(`

@serenity:
    Auth: mreynolds

    $cargo = geisha dolls

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
});
