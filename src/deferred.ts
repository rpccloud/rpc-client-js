import {RPCAny} from "./types"
import {RPCError} from "./error"

export class Deferred {
    public readonly promise: Promise<RPCAny>
    private resolve?: (value: RPCAny | PromiseLike<RPCAny>) => void
    private reject?: (reason: RPCError) => void

    public constructor() {
        this.promise = new Promise((
            resolve: (value: RPCAny | PromiseLike<RPCAny>) => void,
            reject: (reason: RPCError) => void,
        ) => {
            this.resolve = resolve
            this.reject = reject
        })
    }

    public doResolve(value: RPCAny | PromiseLike<RPCAny>): boolean {
        if (this.resolve) {
            this.resolve(value)
            this.resolve = undefined
            this.reject = undefined
            return true
        } else {
            return false
        }
    }

    public doReject(err: RPCError): boolean {
        if (this.reject) {
            this.reject(err)
            this.resolve = undefined
            this.reject = undefined
            return true
        } else {
            return false
        }
    }
}
