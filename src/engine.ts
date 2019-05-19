import request from "request-promise-native";
import { StatusCodeError } from "request-promise-native/errors";

import { IncomingHttpHeaders } from "http";
import { PieFile } from "./ast";
import { RequestContext } from "./context";
import { Parser } from "./parser";

export interface IResponse {
    body: any;
    bodyJson?: any;
    headers: IncomingHttpHeaders;
    httpVersion: string;
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

        let response: request.FullResponse;
        try {
            response = await request(Object.assign({
                resolveWithFullResponse: true,
            }, req));
        } catch (e) {
            if (e instanceof StatusCodeError) {
                response = e.response;
            } else {
                // other, unexpected error
                throw e;
            }
        }

        let bodyJson: any | undefined;
        try {
            bodyJson = JSON.parse(response.body);
        } catch (e) {
            // not parseable as JSON; that's fine
            bodyJson = undefined;
        }

        return {
            body: response.body,
            bodyJson,
            headers: response.headers,
            httpVersion: response.httpVersion,
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
            if (header === "host") continue;
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
