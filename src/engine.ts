import { parse } from "url";

import request from "request-promise-native";
import { StatusCodeError } from "request-promise-native/errors";

import { IncomingHttpHeaders } from "http";
import { PieFile } from "./ast";
import { RequestContext } from "./context";
import { ParseError } from "./parse-error";
import { Parser } from "./parser";
import { ResponseProcessor } from "./processor";

export interface IResponse {
    body: any;
    bodyJson?: any;
    headers: IncomingHttpHeaders;
    httpVersion: string;
    statusCode: number;
    statusMessage: string;
}

const defaultHeaders = {
    "user-agent": `node-pie/${require("../package.json").version}`,
};

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
        return this.performRequest(req);
    }

    public async processRequestAt(
        lineNr: number,
    ) {
        const context = this.findRequestContextAt(lineNr);
        const req = this.buildRequest(context);
        return this.processRequest(context, req);
    }

    public async processRequest(
        context: RequestContext,
        req: request.OptionsWithUrl,
    ) {
        const response = await this.performRequest(req);

        let newVars: any | undefined;
        if (context.processor) {
            const processor = new ResponseProcessor(context.processor);
            newVars = processor.process(context, response);
        }

        return {
            newVars,
            response,
        };
    }

    public async performRequest(
        req: request.OptionsWithUrl,
    ) {
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

    public findRequestContextAt(
        lineNr: number,
    ) {
        const context = RequestContext.create(this.file, lineNr);
        if (!context.hasRequest) {
            // error
            throw new Error("No request found");
        }
        return context;
    }

    public buildRequestAt(
        lineNr: number,
    ) {
        const context = this.findRequestContextAt(lineNr);
        return this.buildRequest(context);
    }

    public buildRequest(
        context: RequestContext,
    ) {
        const headers: {[key: string]: string} = Object.assign({}, defaultHeaders);
        for (const [header, headerValue] of Object.entries(context.headers)) {
            if (header === "host") continue;
            headers[header.toLowerCase()] = headerValue.stringValue;
        }

        const req: request.OptionsWithUrl = {
            body: context.request.body,
            headers,
            method: context.request.method,
            url: buildUrl(context),
        };

        // interpolate variables
        for (const [n, v] of Object.entries(context.vars)) {
            const varName = "$" + n;

            const stringValue = v.stringValue;

            // TODO form encoded body vs json body interpolation?
            if (req.body) req.body = replaceAll(req.body, varName, stringValue);
            req.url = replaceAll(req.url as string, varName, encodeURIComponent(stringValue));

            for (const [header, headerValue] of Object.entries(headers)) {
                headers[header] = replaceAll(headerValue, varName, stringValue);
            }
        }

        if (req.body && !(req.headers && req.headers["content-type"])) {
            req.headers = req.headers || {};
            req.headers["content-type"] = inferContentType(req.body);
        } else if (req.body && req.headers && req.headers["content-type"].startsWith("application/json")) {
            // verify we can parse it as JSON
            try {
                JSON.parse(req.body);
            } catch (e) {
                throw new ParseError("JSON content type declared, but failed to parse as JSON:\n" + e.stack);
            }
        }

        return req;
    }

}

function buildUrl(context: RequestContext) {
    const parsed = parse(context.request.path);
    if (parsed.host) {
        return context.request.path;
    }

    if (!context.headers.host) {
        throw new Error("No host provided");
    }

    let url = context.headers.host.stringValue;
    if (!(url.endsWith("/") || context.request.path.startsWith("/"))) {
        url += "/";
    }

    return url + context.request.path;
}

function inferContentType(body: string) {
    const startTrimmed = body.trimLeft();
    if (startTrimmed.startsWith("{") || startTrimmed.startsWith("[")) {
        try {
            JSON.parse(startTrimmed);

            // TODO charset?
            return "application/json";
        } catch (e) {
            // ignore parse failure
        }
    }

    // TODO ?
}

function replaceAll(haystack: string, needle: string, replacement: string) {
    return haystack.split(needle).join(replacement);
}
