import * as chai from "chai";

import request = require("request");
import { Engine } from "../src/engine";
import { ParseError } from "../src/parser";

chai.should();
const { expect } = chai;

describe("Engine", () => {
    it("requires Host header for paths", async () => {
        const engine = await Engine.fromString(`
GET /cargo
        `.trim());

        expect(() => {
            engine.buildRequestAt(1);
        }).to.throw(Error, /No host/);
    });

    it("combines Host header with paths", async () => {
        const engine = await Engine.fromString(`
Host: https://serenity.co
GET /cargo
        `.trim());

        const req = engine.buildRequestAt(2);
        req.url.should.equal("https://serenity.co/cargo");
    });

    it("combines Host header with relative paths", async () => {
        const engine = await Engine.fromString(`
Host: https://serenity.co
GET cargo
        `.trim());

        const req = engine.buildRequestAt(2);
        req.url.should.equal("https://serenity.co/cargo");
    });

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

    it("interpolates variables", async () => {
        const engine = await Engine.fromString(`
Host: https://serenity.co
Content-Type: application/json

$ship = "serenity"
$cargo = "bobble-headed-geisha-dolls"

POST /cargo/$ship
{
    "id": "$cargo"
}
        `.trim());

        const req = engine.buildRequestAt(7);
        req.url.should.equal("https://serenity.co/cargo/serenity");
        req.body.should.equal(`{
    "id": "bobble-headed-geisha-dolls"
}`);
    });

    it("allows overriding Host with a full URL", async () => {
        const engine = await Engine.fromString(`
Host: https://serenity.co
Content-Type: application/json

$ship = "serenity"
$cargo = "bobble-headed-geisha-dolls"

GET https://alliance.hq/patrols
        `.trim());

        const req = engine.buildRequestAt(7);
        req.url.should.equal("https://alliance.hq/patrols");
    });

    it("allow omitting Host if the request has a full URL", async () => {
        const engine = await Engine.fromString(`
Content-Type: application/json

$ship = "serenity"
$cargo = "bobble-headed-geisha-dolls"

GET https://alliance.hq/patrols
        `.trim());

        const req = engine.buildRequestAt(6);
        req.url.should.equal("https://alliance.hq/patrols");
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
