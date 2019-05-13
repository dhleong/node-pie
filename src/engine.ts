import request from "request-promise-native";

import { PieFile } from "./ast";
import { RequestContext } from "./context";
import { Parser } from "./parser";

export class Engine {
    public static async fromString(s: string) {
        const file = await new Parser().parse(s);
        return new Engine(file);
    }

    constructor(
        private readonly file: PieFile,
    ) {}

    public async performRequestAt(
        lineNr: number,
    ) {
        const req = this.buildRequestAt(lineNr);
        const response: request.FullResponse = await request(Object.assign({
            resolveWithFullResponse: true,
        }, req));

        return {
            body: response.body,
            headers: response.headers,
            statusCode: response.statusCode,
            statusMessage: response.statusMessage,
        };
    }

    public buildRequestAt(
        lineNr: number,
    ) {
        const context = RequestContext.create(this.file, lineNr);
        if (!context.headers.host) {
            throw new Error("No host provided");
        }

        const headers: {[key: string]: string} = {};
        for (const [header, headerValue] of Object.entries(context.headers)) {
            headers[header] = headerValue;
        }

        const req: request.OptionsWithUrl = {
            body: context.request.body,
            headers,
            method: context.request.method,
            url: context.headers.host + context.request.path,
        };

        // interpolate variables
        for (const [n, v] of Object.entries(context.vars)) {
            const varName = "$" + n;

            // TODO form encoded body vs json body interpolation?
            if (req.body) req.body = req.body.replace(varName, v);
            req.url = (req.url as string).replace(varName, encodeURIComponent(v));

            for (const [header, headerValue] of Object.entries(headers)) {
                headers[header] = headerValue.replace(varName, v);
            }
        }

        return req;
    }

}
