import * as chai from "chai";

import { RequestContext } from "../src/context";
import { Parser } from "../src/parser";

chai.should();

describe("RequestContext", () => {
    it("Handles single line", async () => {
        const file = await new Parser().parse(`
GET /ship
        `.trim());

        const context = RequestContext.create(file, 1);
        context.request.path.should.equal("/ship");
    });

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

    it("supports multiple environments", async () => {
        const file = await new Parser().parse(`
$ENV = "serenity,firefly"
@serenity:
    $captain = "mreynolds"

@firefly:
    $class = "03-K64-Firefly"

GET /ships/$class
        `);

        const context = RequestContext.create(file, 9);
        context.vars.captain.should.equal("mreynolds");
        context.vars.class.should.equal("03-K64-Firefly");
    });

    it("handles request-specific headers", async () => {
        const file = await new Parser().parse(`
$ENV = "serenity"
Authorization: none
@serenity:
    Authorization: serenity

GET /ships/serenity
Authorization: kaylee
        `);

        const context = RequestContext.create(file, 8);
        context.headers.authorization.should.equal("kaylee");
    });
});
