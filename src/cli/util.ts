import colorizer from "json-colorizer";

export function colorize(json: any) {
    return colorizer(json, {
        pretty: true,

        colors: {
            STRING_LITERAL: "#fff",
        },
    });
}
