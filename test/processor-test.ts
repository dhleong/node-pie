import * as chai from "chai";

import { RequestContext } from "../src/context";
import { Engine } from "../src/engine";
import { ResponseProcessor } from "../src/processor";

chai.should();

describe("Processor", () => {
    it("returns updated vars", async () => {
        const engine = await Engine.fromString(`
GET /cargo | stash

PROCESSOR stash \`\`\`
vars.stashed = json.cargo[0];
\`\`\`
        `.trim());

        const context = engine.findRequestContextAt(1);
        const result = await processJsonResponse(context, {
            cargo: [
                "bobble-headed-geisha-dolls",
            ],
        });
        result.stashed.should.equal("bobble-headed-geisha-dolls");
    });

    it("returns ONLY updated vars", async () => {
        const engine = await Engine.fromString(`
$captain = "mreynolds"
$stashed = 0

GET /cargo | stash

PROCESSOR stash \`\`\`
vars.hasStash = 1;
vars.stashed = json.cargo[0];
\`\`\`
        `.trim());

        const context = engine.findRequestContextAt(4);
        const result = await processJsonResponse(context, {
            cargo: [
                "bobble-headed-geisha-dolls",
            ],
        });
        result.stashed.should.equal("bobble-headed-geisha-dolls");
        result.hasStash.should.equal(1);
        result.should.not.have.property("captain");
    });
});

function processJsonResponse(context: RequestContext, json: any) {
    if (!context.processor) {
        throw new Error("missing processor");
    }

    const processor = new ResponseProcessor(context.processor);
    return processor.process(context, jsonResponse(json));
}

function jsonResponse(json: any) {
    return {
        body: "",
        bodyJson: json,
        headers: {},
        httpVersion: "2",
        statusCode: 200,
        statusMessage: "OK",
    };
}
