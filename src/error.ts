export enum ErrorType {
    Config = 1,
    Net = 2,
    Action = 3,
    Develop = 4,
    Kernel = 5,
    Security = 6,
}

export enum ErrorLevel {
    Warn = 1,
    Error = 2,
    Fatal = 3,
}

export function defineError(
    kind: ErrorType,
    index: number,
    level: ErrorLevel,
    message: string
): RPCError {
    return new RPCError((kind << 20) | (level << 16) | index, message);
}

export class RPCError {
    private readonly code: number;
    private readonly message: string;

    public constructor(code: number, message: string) {
        this.code = code;
        this.message = message;
    }

    public getCode(): number {
        return this.code & 0xffffff;
    }

    public getMessage(): string {
        return this.message;
    }

    public addDebug(debug: string | undefined): RPCError {
        if (!debug) {
            return this;
        }

        if (!this.message) {
            return new RPCError(this.code, debug);
        } else {
            return new RPCError(this.code, this.message + "\n" + debug);
        }
    }

    private getErrorTypeString(): string {
        switch ((this.code >> 20) & 0x0f) {
            case ErrorType.Config:
                return "Config";
            case ErrorType.Net:
                return "Net";
            case ErrorType.Action:
                return "Action";
            case ErrorType.Develop:
                return "Develop";
            case ErrorType.Kernel:
                return "Kernel";
            case ErrorType.Security:
                return "Security";
            default:
                return "";
        }
    }

    private getErrorLevelString(): string {
        switch ((this.code >> 16) & 0x0f) {
            case ErrorLevel.Warn:
                return "Warn";
            case ErrorLevel.Error:
                return "Error";
            case ErrorLevel.Fatal:
                return "Fatal";
            default:
                return "";
        }
    }

    public toString(): string {
        return (
            this.getErrorTypeString() +
            this.getErrorLevelString() +
            "[" +
            (this.code & 0xffff) +
            "]: " +
            this.message
        );
    }
}

const generalErrorSeg = 0;
export const ErrStream = defineError(
    ErrorType.Security,
    generalErrorSeg | 1,
    ErrorLevel.Warn,
    "stream error"
);

// ErrUnsupportedValue ...
export const ErrUnsupportedValue = defineError(
    ErrorType.Develop,
    generalErrorSeg | 2,
    ErrorLevel.Error,
    ""
);

const clientErrorSeg = 4 << 8;
export const ErrClientTimeout = defineError(
    ErrorType.Net,
    clientErrorSeg | 1,
    ErrorLevel.Warn,
    ""
);

export const ErrClientConfig = defineError(
    ErrorType.Config,
    clientErrorSeg | 2,
    ErrorLevel.Warn,
    "client config error"
);

const jsAdapterErrorSeg = 102 << 8;
export const ErrJSUnsupportedProtocol = defineError(
    ErrorType.Net,
    jsAdapterErrorSeg | 1,
    ErrorLevel.Warn,
    ""
);

export const ErrJSWebSocketWriteStream = defineError(
    ErrorType.Net,
    jsAdapterErrorSeg | 2,
    ErrorLevel.Warn,
    ""
);

export const ErrJSWebSocketOnError = defineError(
    ErrorType.Net,
    jsAdapterErrorSeg | 3,
    ErrorLevel.Warn,
    ""
);

export const ErrJSWebSocketDail = defineError(
    ErrorType.Net,
    jsAdapterErrorSeg | 4,
    ErrorLevel.Warn,
    ""
);
