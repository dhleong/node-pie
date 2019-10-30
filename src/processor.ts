import { VM } from "vm2";

import { ProcessorDef } from "./ast";
import { RequestContext } from "./context";
import { IResponse } from "./engine";

export class ResponseProcessor {
    constructor(
        private readonly def: ProcessorDef,
    ) {}

    public async process(context: RequestContext, response: IResponse) {
        const vars: {[name: string]: any} = {};
        for (const varName of Object.keys(context.vars)) {
            vars[varName] = context.vars[varName];
        }

        const sandbox: any = {
            headers: response.headers,
            status: response.statusCode,
            vars,
        };

        if (response.bodyJson) {
            sandbox.json = response.bodyJson;
        }

        const vm = new VM({
            sandbox,
        });
        vm.run(this.def.source);

        return sandbox.vars;
    }
}
