import { SOCKET_SYMBOL } from './symbols';

export namespace HexNut {
  export interface Context {
    isComplete: boolean;
    send(): Context;
    [SOCKET_SYMBOL]: WebSocket
  }

  export interface Config {
    port: number;
    // ..
  }

  export type MiddlewareFn = (ctx: Context, next: () => any) => any;

  export interface Connections {
    [key: string]: Context;
  }
}