import * as chai from "chai";

import { RequestContext } from "../src/context";
import { Parser } from "../src/parser";

chai.should();

describe("RequestContext", () => {
    it("respects $ENV", async () => {
        const file = await new Parser().parse(`
$ENV = "serenity"
@serenity:
    $captain = "mreynolds"

@alliance:
    $captain = "nobody"

GET /captains/$captain
        `);

        const context = RequestContext.create(file, 9);
        context.vars.captain.should.equal("mreynolds");
    });
});
