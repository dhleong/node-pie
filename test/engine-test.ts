import * as chai from "chai";

import request = require("request");
import { Engine } from "../src/engine";
import { ParseError } from "../src/parser";

chai.should();
const { expect } = chai;

describe("Engine", () => {
    it("infers JSON content-type", async () => {
        const engine = await Engine.fromString(`
Host: https://serenity.co
POST /cargo
{
    "id": "bobble-headed-geisha-dolls"
}
        `.trim());

        const req = engine.buildRequestAt(2);

        expectHeader(req, "content-type")
            .to.match(/^application\/json/);
    });

    it("validates JSON content", async () => {
        const engine = await Engine.fromString(`
Host: https://serenity.co
Content-Type: application/json
POST /cargo
{
    "invald",
}
        `.trim());

        expect(() => {
            engine.buildRequestAt(3);
        }).to.throw(ParseError, /failed to parse/);
    });
});

// NOTE: I'd like to extend chai "should" for this method,
// but it seems to be really annoying to do with chai...
function expectHeader(
    req: request.OptionsWithUrl,
    headerName: string,
) {
    expect(req).to.have.property("headers");
    return expect(req.headers).to.have.property(headerName);
}
