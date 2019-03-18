import WebSocket from 'ws';
import * as http from 'http';
import * as uuid from 'uuid/v4';

import config from './config';
import { Context } from './context';

/**
 * @typedef {function(ctx, NextMiddlewareFn)} middleware
 * @callback middleware
 * @param {ctx} ctx Context object for the connection
 * @param {NextMiddlewareFn} next Callback function that triggers the next middleware
 */

export namespace HexNut {
  export type MiddlewareFn = (ctx: Context, next: () => any) => any;

  export interface Connections {
    [key: string]: Context;
  }
}

/**
 * HexNut server instance
 */
export class HexNut {

  config: WebSocket.ServerOptions;
  server: any;
  isRunning = false;
  middleware: HexNut.MiddlewareFn[] = [];
  connections: HexNut.Connections = {};
  onerror: any;

  /**
   * Create a new HexNut instance
   * @param {object} wsConfig - Config object, mixed with defaults, passed to Websocket.Server constructor
   */
  constructor(wsConfig = {}) {
    this.config = {
      ...config,
      ...wsConfig
    };

  }

  /**
   * Adds a middleware function to the HexNut instance
   */
  use(middleware: HexNut.MiddlewareFn) {
    this.middleware.push(middleware);
  }

  /**
   * Start the HexNut Websocket Server
   */
  start() {
    this.server = new WebSocket.Server(this.config);
    this.isRunning = true;

    this.server.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
      const id: string = 'asdf7858'; // uuid();
      const ctx: Context = new Context(ws, req, this);
      this.connections[id] = ctx;

      this.runMiddleware(ctx);

      ws.on('message', (message: string) => {
        ctx._reset(message);
        this.runMiddleware(ctx);
      });

      ws.on('close', () => {
        ctx.message = null;
        ctx.type = 'closing';
        this.runMiddleware(ctx).then(() => {
          delete this.connections[id];
        });
      });
    });
  }

  /**
   * Stop the HexNut Websocket Server
   */
  stop() {
    if (this.isRunning) {
      this.isRunning = false;
      Object.entries(this.connections).forEach(([id, connection]: [string, Context]) => {
        connection.ws.close();
        delete this.connections[id];
      });
      this.server.close();
    }
  }

  /**
   * @private
   * @param {Error} err
   * @param {Context} ctx
   */
  onError(err: Error, ctx: Context) {
    if (typeof this.onerror === 'function') {
      return this.onerror(err, ctx);
    }
  }

  /**
   * @private
   * @param {Context} ctx
   */
  runMiddleware(ctx: Context) {
    const i = 0;
    const run = async (idx: number): Promise<any> => {
      if (!ctx.isComplete && typeof this.middleware[idx] === 'function') {
        return await this.middleware[idx](ctx, () => run(idx + 1));
      }
    };
    return run(i).catch((err: Error) => this.onError(err, ctx));
  }
}
