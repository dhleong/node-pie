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
            vars[varName] = context.vars[varName].value;
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

        const result: typeof vars = {};
        for (const varName of Object.keys(sandbox.vars)) {
            const contextVar = context.vars[varName];
            if (!contextVar || sandbox.vars[varName] !== contextVar.value) {
                result[varName] = sandbox.vars[varName];
            }
        }

        return result;
    }
}
