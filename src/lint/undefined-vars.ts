import { IInterval } from "../ast";
import { RequestContext } from "../context";
import { ILint } from "./model";

interface IReferencedVar {
    name: string;
    context: IInterval;
}

export function *detectUndefinedVars(
    context: RequestContext,
): Iterable<ILint> {
    for (const ref of referencedVars(context)) {
        const location = locateReference(context, ref);

        if (!context.vars[ref.name]) {
            yield Object.assign({
                message: `Reference to undefined var $${ref.name}`,
                type: "warn",
            } as const, location);
        }
    }
}

function *referencedVars(context: RequestContext) {
    for (const value of Object.values(context.headers)) {
        if (typeof value.value !== "string") continue;

        yield *findVarsIn(value.interval, value.stringValue);
    }

    yield *findVarsIn(context.request.interval, context.request.body || "");
    yield *findVarsIn(context.request.interval, context.request.path || "");
}

function *findVarsIn(context: IInterval, str: string): Iterable<IReferencedVar> {
    const regex = /\$([a-zA-Z0-9_-]+)/g;

    while (true) {
        const match = regex.exec(str);
        if (!match) return;

        yield {
            context,
            name: match[1],
        };
    }
}

function locateReference(
    context: RequestContext,
    ref: IReferencedVar,
) {
    const [ lineStart, lineEnd ] = context.lines.lineRange(ref.context);
    const varName = "$" + ref.name;

    for (let i = lineStart; i <= lineEnd; ++i) {
        const lineText = context.lines.get(i);
        const column = lineText.indexOf(varName);
        if (column !== -1) {
            return {
                // NOTE: column is 1-index
                column: column + 1,
                line: i,

                endColumn: column + varName.length,
                endLine: i,
            };
        }
    }

    // if we couldn't find it, just return the start
    return {
        column: 1,
        line: lineStart,
    };
}
