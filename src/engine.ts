import request from "request-promise-native";

import { IncomingHttpHeaders } from "http";
import { PieFile } from "./ast";
import { RequestContext } from "./context";
import { Parser } from "./parser";

export interface IResponse {
    body: any;
    bodyJson?: any;
    headers: IncomingHttpHeaders;
    statusCode: number;
    statusMessage: string;
}

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
    ): Promise<IResponse> {
        const req = this.buildRequestAt(lineNr);
        const response: request.FullResponse = await request(Object.assign({
            resolveWithFullResponse: true,
        }, req));

        let bodyJson: any | undefined;
        if (response.headers["content-type"] === "application/json") {
            bodyJson = JSON.parse(response.body);
        }

        return {
            body: response.body,
            bodyJson,
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
            headers[header] = headerValue.toString();
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

            const stringValue = v.toString();

            // TODO form encoded body vs json body interpolation?
            if (req.body) req.body = req.body.replace(varName, v);
            req.url = (req.url as string).replace(varName, encodeURIComponent(stringValue));

            for (const [header, headerValue] of Object.entries(headers)) {
                headers[header] = headerValue.replace(varName, stringValue);
            }
        }

        return req;
    }

}
