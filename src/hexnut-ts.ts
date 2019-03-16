import WebSocket from 'ws';
import { v4 as uuid } from 'uuid';
import config from './config';
import createCtx from './ctx';
import { SOCKET_SYMBOL } from './symbols';

/**
 * @typedef {function(ctx, NextMiddlewareFn)} middleware
 * @callback middleware
 * @param {ctx} ctx Context object for the connection
 * @param {NextMiddlewareFn} next Callback function that triggers the next middleware
 */

export interface HexnutContext {
  isComplete: boolean;
  send(): HexnutContext;
  [SOCKET_SYMBOL]: WebSocket
}

export interface HexNutConfig {
  port: number;
  // ..
}

export type MiddlewareFn = (ctx: HexnutContext, next: () => any) => any;

export interface HexnutConnections {
  [key: string]: HexnutContext;
}

/**
 * HexNut server instance
 */
export class HexNut {

  config: HexNutConfig;
  server: any;
  isRunning = false;
  middleware: MiddlewareFn[] = [];
  connections: HexnutConnections = {};
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
  use(middleware: MiddlewareFn) {
    this.middleware.push(middleware);
  }

  /**
   * Start the HexNut Websocket Server
   */
  start() {
    this.server = new WebSocket.Server(this.config);
    this.isRunning = true;

    this.server.on('connection', (ws: WebSocket, req: any) => {
      const id = uuid();
      const ctx = createCtx(ws, req, this);
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
      Object.entries(this.connections).forEach(([id, connection]: [string, HexnutContext]) => {
        connection[SOCKET_SYMBOL].close();
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
  onError(err: Error, ctx: HexnutContext) {
    if (typeof this.onerror === 'function') {
      return this.onerror(err, ctx);
    }
  }

  /**
   * @private
   * @param {Context} ctx
   */
  runMiddleware(ctx: HexnutContext) {
    let i = 0;
    const run = async (idx: number) => {
      if (!ctx.isComplete && typeof this.middleware[idx] === 'function') {
        return await this.middleware[idx](ctx, () => run(idx+1));
      }
    };
    return run(i).catch((err: Error) => this.onError(err, ctx));
  }
}
