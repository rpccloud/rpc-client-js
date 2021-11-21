import { defineError, ErrorLevel, ErrorType, RPCError } from "./error";

describe("RPCError tests", () => {
    test("ErrorType", () => {
        expect(ErrorType.Config).toStrictEqual(1);
        expect(ErrorType.Net).toStrictEqual(2);
        expect(ErrorType.Action).toStrictEqual(3);
        expect(ErrorType.Develop).toStrictEqual(4);
        expect(ErrorType.Kernel).toStrictEqual(5);
        expect(ErrorType.Security).toStrictEqual(6);
    });

    test("ErrorLevel", () => {
        expect(ErrorLevel.Warn).toStrictEqual(1);
        expect(ErrorLevel.Error).toStrictEqual(2);
        expect(ErrorLevel.Fatal).toStrictEqual(3);
    });

    test("defineError", () => {
        expect(
            defineError(ErrorType.Net, 12, ErrorLevel.Warn, "msg")
        ).toStrictEqual(
            new RPCError(
                (ErrorType.Net << 20) | (ErrorLevel.Warn << 16) | 12,
                "msg"
            )
        );
    });

    test("new RPCError", () => {
        expect(
            new RPCError(
                (ErrorType.Net << 20) | (ErrorLevel.Warn << 16) | 12,
                "msg"
            )
        ).toStrictEqual(defineError(ErrorType.Net, 12, ErrorLevel.Warn, "msg"));
    });

    test("RPCError.getCode", () => {
        expect(new RPCError(654321, "msg").getCode()).toStrictEqual(654321);
    });

    test("RPCError.getMessage", () => {
        expect(new RPCError(654321, "msg").getMessage()).toStrictEqual("msg");
    });

    test("RPCError.addDebug", () => {
        expect(new RPCError(654321, "").addDebug("debug")).toStrictEqual(
            new RPCError(654321, "debug")
        );

        expect(new RPCError(654321, "msg").addDebug("debug")).toStrictEqual(
            new RPCError(654321, "msg\ndebug")
        );
    });

    test("RPCError.toString", () => {
        // ErrorType.Config
        expect(
            defineError(ErrorType.Config, 12, ErrorLevel.Warn, "msg").toString()
        ).toStrictEqual("ConfigWarn[12]: msg");

        expect(
            defineError(
                ErrorType.Config,
                12,
                ErrorLevel.Error,
                "msg"
            ).toString()
        ).toStrictEqual("ConfigError[12]: msg");

        expect(
            defineError(
                ErrorType.Config,
                12,
                ErrorLevel.Fatal,
                "msg"
            ).toString()
        ).toStrictEqual("ConfigFatal[12]: msg");

        // ErrorType.Net
        expect(
            defineError(ErrorType.Net, 12, ErrorLevel.Warn, "msg").toString()
        ).toStrictEqual("NetWarn[12]: msg");

        expect(
            defineError(ErrorType.Net, 12, ErrorLevel.Error, "msg").toString()
        ).toStrictEqual("NetError[12]: msg");

        expect(
            defineError(ErrorType.Net, 12, ErrorLevel.Fatal, "msg").toString()
        ).toStrictEqual("NetFatal[12]: msg");

        // ErrorType.Action
        expect(
            defineError(ErrorType.Action, 12, ErrorLevel.Warn, "msg").toString()
        ).toStrictEqual("ActionWarn[12]: msg");

        expect(
            defineError(
                ErrorType.Action,
                12,
                ErrorLevel.Error,
                "msg"
            ).toString()
        ).toStrictEqual("ActionError[12]: msg");

        expect(
            defineError(
                ErrorType.Action,
                12,
                ErrorLevel.Fatal,
                "msg"
            ).toString()
        ).toStrictEqual("ActionFatal[12]: msg");

        // ErrorType.Develop
        expect(
            defineError(
                ErrorType.Develop,
                12,
                ErrorLevel.Warn,
                "msg"
            ).toString()
        ).toStrictEqual("DevelopWarn[12]: msg");

        expect(
            defineError(
                ErrorType.Develop,
                12,
                ErrorLevel.Error,
                "msg"
            ).toString()
        ).toStrictEqual("DevelopError[12]: msg");

        expect(
            defineError(
                ErrorType.Develop,
                12,
                ErrorLevel.Fatal,
                "msg"
            ).toString()
        ).toStrictEqual("DevelopFatal[12]: msg");

        // ErrorType.Kernel
        expect(
            defineError(ErrorType.Kernel, 12, ErrorLevel.Warn, "msg").toString()
        ).toStrictEqual("KernelWarn[12]: msg");

        expect(
            defineError(
                ErrorType.Kernel,
                12,
                ErrorLevel.Error,
                "msg"
            ).toString()
        ).toStrictEqual("KernelError[12]: msg");

        expect(
            defineError(
                ErrorType.Kernel,
                12,
                ErrorLevel.Fatal,
                "msg"
            ).toString()
        ).toStrictEqual("KernelFatal[12]: msg");

        // ErrorType.Security
        expect(
            defineError(
                ErrorType.Security,
                12,
                ErrorLevel.Warn,
                "msg"
            ).toString()
        ).toStrictEqual("SecurityWarn[12]: msg");

        expect(
            defineError(
                ErrorType.Security,
                12,
                ErrorLevel.Error,
                "msg"
            ).toString()
        ).toStrictEqual("SecurityError[12]: msg");

        expect(
            defineError(
                ErrorType.Security,
                12,
                ErrorLevel.Fatal,
                "msg"
            ).toString()
        ).toStrictEqual("SecurityFatal[12]: msg");

        // unsupported type
        expect(new RPCError(65432, "msg").toString()).toStrictEqual(
            "[65432]: msg"
        );
    });
});
