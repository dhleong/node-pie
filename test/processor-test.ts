import * as chai from "chai";

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
        if (!context.processor) {
            throw new Error("missing processor");
        }

        const processor = new ResponseProcessor(context.processor);
        const result = await processor.process(context, {
            body: "",
            bodyJson: {
                cargo: [
                    "bobble-headed-geisha-dolls",
                ],
            },
            headers: {},
            httpVersion: "2",
            statusCode: 200,
            statusMessage: "OK",
        });
        result.stashed.should.equal("bobble-headed-geisha-dolls");
    });
});
