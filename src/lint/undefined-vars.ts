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
        // TODO can we figure out what col the actual reference is on?
        const [ line ] = context.lines.lineRange(ref.context);
        const lineText = context.lines.get(line);
        const col = lineText.indexOf(ref.name);

        if (!context.vars[ref.name]) {
            yield {
                // NOTE: column is 1-index, so the -1 to point to the
                // dollar char cancels out the +1 to match the column
                column: col === -1 ? 1 : col,
                length: col === -1 ? undefined : ref.name.length + 1,
                line,
                message: `Reference to undefined var $${ref.name}`,
                type: "warn",
            };
        }
    }
}

function *referencedVars(context: RequestContext) {
    for (const value of Object.values(context.headers)) {
        if (typeof value.value !== "string") continue;

        yield *findVarsIn(value.interval, value.stringValue);
    }

    // TODO can we be more precise about the detected var location?
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
