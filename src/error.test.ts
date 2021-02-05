import {RPCError} from "./error"

describe("RPCError tests", () => {
    test("RPCError_Kind", () => {
        expect(RPCError.KindNone).toStrictEqual(0)
        expect(RPCError.KindProtocol).toStrictEqual(1)
        expect(RPCError.KindTransport).toStrictEqual(2)
        expect(RPCError.KindReply).toStrictEqual(3)
        expect(RPCError.KindReplyPanic).toStrictEqual(4)
        expect(RPCError.KindRuntimePanic).toStrictEqual(5)
        expect(RPCError.KindKernelPanic).toStrictEqual(6)
    })

    test("RPCError_newProtocolError", () => {
        expect(RPCError.newProtocolError("message")).toStrictEqual(
            new RPCError(RPCError.KindProtocol, "message", ""),
        )
    })

    test("RPCError_newTransportError", () => {
        expect(RPCError.newTransportError("message")).toStrictEqual(
            new RPCError(RPCError.KindTransport, "message", ""),
        )
    })

    test("RPCError_newReplyError", () => {
        expect(RPCError.newReplyError("message")).toStrictEqual(
            new RPCError(RPCError.KindReply, "message", ""),
        )
    })

    test("RPCError_newReplyPanic", () => {
        expect(RPCError.newReplyPanic("message")).toStrictEqual(
            new RPCError(RPCError.KindReplyPanic, "message", ""),
        )
    })

    test("RPCError_newRuntimePanic", () => {
        expect(RPCError.newRuntimePanic("message")).toStrictEqual(
            new RPCError(RPCError.KindRuntimePanic, "message", ""),
        )
    })

    test("RPCError_newKernelPanic", () => {
        expect(RPCError.newKernelPanic("message")).toStrictEqual(
            new RPCError(RPCError.KindKernelPanic, "message", ""),
        )
    })

    test("RPCError_newSecurityLimitError", () => {
        expect(RPCError.newSecurityLimitError("message")).toStrictEqual(
            new RPCError(RPCError.KindSecurityLimit, "message", ""),
        )
    })

    test("RPCError_getKind", () => {
        expect(RPCError.newKernelPanic("message").getKind()).toStrictEqual(
            RPCError.KindKernelPanic,
        )
    })

    test("RPCError_getMessage", () => {
        expect(RPCError.newKernelPanic("message").getMessage()).toStrictEqual(
            "message",
        )
    })

    test("RPCError_getDebug", () => {
        expect(
            new RPCError(RPCError.KindReply, "message", "debug").getDebug(),
        ).toStrictEqual(
            "debug",
        )
    })

    test("RPCError_addDebug", () => {
        expect(
            new RPCError(RPCError.KindReply, "message", null).addDebug("debug"),
        ).toStrictEqual(
            new RPCError(RPCError.KindReply, "message", "debug"),
        )

        expect(
            new RPCError(RPCError.KindReply, "message", "").addDebug("debug"),
        ).toStrictEqual(
            new RPCError(RPCError.KindReply, "message", "debug"),
        )

        expect(
            new RPCError(RPCError.KindReply, "message", "debug").addDebug("debug"),
        ).toStrictEqual(
            new RPCError(RPCError.KindReply, "message", "debug\ndebug"),
        )

        expect(
            new RPCError(RPCError.KindReply, "message", null).addDebug(null),
        ).toStrictEqual(
            new RPCError(RPCError.KindReply, "message", null),
        )

        expect(
            new RPCError(RPCError.KindReply, "message", "").addDebug(null),
        ).toStrictEqual(
            new RPCError(RPCError.KindReply, "message", ""),
        )

        expect(
            new RPCError(RPCError.KindReply, "message", "debug").addDebug(null),
        ).toStrictEqual(
            new RPCError(RPCError.KindReply, "message", "debug"),
        )
    })
})
