export enum VarType {
    Header,
    Variable,
}

export class Var {
    public static header(name: string, value: string) {
        return new Var(VarType.Header, name, value);
    }

    public static variable(name: string, value: string | number) {
        return new Var(VarType.Variable, name, value);
    }

    constructor(
        public readonly type: VarType,
        public readonly name: string,
        public readonly value: string | number,
    ) {}
}

export class EnvironmentDef {
    constructor(
        public readonly id: string,
        public readonly vars: Var[],
    ) {}
}

/**
 * Character range within the source file
 */
export interface IInterval {
    start: number;
    end: number;
}

export class RequestDef {
    constructor(
        public readonly method: string,
        public readonly path: string,
        public readonly body: string | null,
        public readonly headers: Var[],
        public readonly interval: IInterval,
    ) {}
}

export class PieFile {
    constructor(
        public source: string,
        public readonly entries: Array<Var | EnvironmentDef | RequestDef>,
    ) {}
}
