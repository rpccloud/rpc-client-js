
export class RPCError {
  public static readonly KindNone: number = 0;
  public static readonly KindProtocol: number = 1;
  public static readonly KindTransport: number = 2;
  public static readonly KindReply: number = 3;
  public static readonly KindReplyPanic: number = 4;
  public static readonly KindRuntimePanic: number = 5;
  public static readonly KindKernelPanic: number = 6;
  public static readonly KindSecurityLimit: number = 7;

  public static newProtocolError(message: string): RPCError {
      return new RPCError(RPCError.KindProtocol, message, "")
  }

  public static newTransportError(message: string): RPCError {
      return new RPCError(RPCError.KindTransport, message, "")
  }

  public static newReplyError(message: string): RPCError {
      return new RPCError(RPCError.KindReply, message, "")
  }

  public static newReplyPanic(message: string): RPCError {
      return new RPCError(RPCError.KindReplyPanic, message, "")
  }

  public static newRuntimePanic(message: string): RPCError {
      return new RPCError(RPCError.KindRuntimePanic, message, "")
  }

  public static newKernelPanic(message: string): RPCError {
      return new RPCError(RPCError.KindKernelPanic, message, "")
  }

  public static newSecurityLimitError(message: string): RPCError {
      return new RPCError(RPCError.KindSecurityLimit, message, "")
  }

  private readonly kind: number;
  private readonly message: string | null;
  private debug: string | null;

  public constructor(
      kind: number, message: string | null, debug: string | null) {
      this.kind = kind
      this.message = message
      this.debug = debug
  }

  public getKind(): number {
      return this.kind
  }

  public getMessage(): string | null {
      return this.message
  }

  public getDebug(): string | null {
      return this.debug
  }

  public addDebug(debug: string | null): RPCError {
      if (debug != null && debug != "") {
          if (this.debug == null || this.debug == "") {
              this.debug = debug
          } else {
              this.debug += "\n"
              this.debug += debug
          }
      }

      return this
  }
}
