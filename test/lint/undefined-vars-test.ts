import * as chai from "chai";
import chaiSubset from "chai-subset";

import { RequestContext } from "../../src/context";
import { detectUndefinedVars } from "../../src/lint/undefined-vars";

import { Parser } from "../../src/parser";
import { toList } from "../util";

chai.use(chaiSubset);
chai.should();

async function contextOf(pieContents: string, lineNr: number) {
    const parsed = await new Parser().parse(pieContents);
    return RequestContext.create(parsed, lineNr);
}

describe("detectUndefinedVars", () => {
    it("points to headers where they're defined", async () => {
        const lint = toList(detectUndefinedVars(
            await contextOf(`
Host: https://serenity.co
Authorization: $auth
GET /cargo
            `.trim(), 3),
        ));

        lint.should.containSubset([
            {
                column: 16,
                line: 2,
                message: "Reference to undefined var $auth",

                endColumn: 21,
                endLine: 2,
            },
        ]);
    });

    it.only("works in multi-line body", async () => {
        const lint = toList(detectUndefinedVars(
            await contextOf(`
Host: https://serenity.co
POST /cargo
{
    "id": "$cargo"
}
            `.trim(), 3),
        ));

        lint.should.containSubset([
            {
                column: 12,
                line: 4,
                message: "Reference to undefined var $cargo",

                endColumn: 17,
                endLine: 4,
            },
        ]);
    });
});
