import fs from "fs-extra";

import { Engine } from "../engine";
import { colorize } from "./util";

// tslint:disable no-console

export async function executeRequest(
    opts: {
        file: string,
        line: number,
    },
) {
    const contents = await fs.readFile(opts.file);
    const engine = await Engine.fromString(contents.toString());
    const response = await engine.performRequestAt(opts.line);

    if (response.bodyJson) {
        console.log(colorize(response.bodyJson));
        return;
    }

    // TODO
    console.log(response);
}
