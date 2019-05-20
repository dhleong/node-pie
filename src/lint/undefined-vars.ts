import { RequestContext } from "../context";
import { ILint } from "./model";

function *findVarsIn(str: string) {
    const regex = /\$([a-zA-Z0-9_-]+)/g;

    while (true) {
        const match = regex.exec(str);
        if (!match) return;

        yield match[1];
    }
}

export function *detectUndefinedVars(
    context: RequestContext,
): Iterable<ILint> {
    const [ line ] = context.lines.lineRange(context.request.interval);

    for (const v of referencedVars(context)) {
        // TODO can we figure out what line and col the actual reference is on?
        if (!context.vars[v]) {
            yield {
                column: 1,
                line,
                message: `Reference to undefined var $${v}`,
                type: "warn",
            };
        }
    }
}

function *referencedVars(context: RequestContext) {
    // FIXME: we should report undefined vars in headers
    // *on the header's line*
    for (const value of Object.values(context.headers)) {
        if (typeof value !== "string") continue;

        yield *findVarsIn(value);
    }

    yield *findVarsIn(context.request.body || "");
    yield *findVarsIn(context.request.path || "");
}
