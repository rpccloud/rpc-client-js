import { Deferred } from "./deferred";
import { toRPCInt64 } from "./types";
import { RPCError } from "./error";

describe("deferred tests", () => {
    test("Deferred_new", async () => {
        const deferred1 = new Deferred();
        expect(deferred1.promise).toBeTruthy();
        expect(deferred1["resolve"]).toBeTruthy();
        expect(deferred1["reject"]).toBeTruthy();
    });

    test("Deferred_doResolve", async () => {
        const deferred1 = new Deferred();
        expect(deferred1.doResolve(toRPCInt64(5))).toStrictEqual(true);
        expect(await deferred1.promise).toStrictEqual(toRPCInt64(5));

        const deferred2 = new Deferred();
        setTimeout(() => {
            expect(deferred2.doResolve(toRPCInt64(6))).toStrictEqual(true);
        }, 50);
        expect(await deferred2.promise).toStrictEqual(toRPCInt64(6));

        // promise chin
        const deferred3 = new Deferred();
        const deferred4 = new Deferred();
        setTimeout(() => {
            expect(deferred3.doResolve(deferred4.promise)).toStrictEqual(true);
        }, 30);
        setTimeout(() => {
            expect(deferred4.doResolve(toRPCInt64(10))).toStrictEqual(true);
        }, 50);
        expect(await deferred3.promise).toStrictEqual(toRPCInt64(10));

        // deferred is done
        expect(deferred1.doResolve(toRPCInt64(10))).toStrictEqual(false);
    });

    test("Deferred_doReject", async () => {
        const err = new RPCError(12, "message");
        const deferred1 = new Deferred();
        expect(deferred1.doReject(err)).toStrictEqual(true);
        try {
            await deferred1.promise;
            expect(true).toStrictEqual(false);
        } catch (e) {
            expect(e).toStrictEqual(err);
        }

        const deferred2 = new Deferred();
        setTimeout(() => {
            expect(deferred2.doReject(err)).toStrictEqual(true);
        }, 50);
        try {
            await deferred2.promise;
            expect(true).toStrictEqual(false);
        } catch (e) {
            expect(e).toStrictEqual(err);
        }

        // deferred is done
        expect(deferred1.doReject(err)).toStrictEqual(false);
    });
});
