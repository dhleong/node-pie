import * as chai from "chai";

import { findLint } from "../../src/cli/lint";

chai.should();

describe("findLint", () => {
    it("should de-dup results", async () => {
        const lint = await findLint(`
Host: https://serenity.co
Auth: $auth

GET /cargo

GET /crew
        `);

        lint.should.have.lengthOf(1);
    });
});
