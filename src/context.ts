import { HexNut } from './index';

/**
 * @class
 * Context object representing a HexNut connection
 */
export class Context {

  type: 'connection' | 'message' | 'type' | 'closing' = 'connection';
  message: string | null = null;
  isComplete = false;

  constructor(public ws: any, public req: any, public app: HexNut) {

  }

   _reset(message: string) {
    this.type = 'message';
    this.isComplete = false;
    this.message = message;
  }

  /**
   * Send a message to the client
   */
  send(data: any, cb?: (err?: Error) => void) {
    this.ws.send(data, cb);
    return this;
  }

  /**
   * Send a message to all connected clients
   */
  sendToAll(data: any, cb?: (err?: Error) => void): Context {
    Object.values(this.app.connections).forEach(ctx =>
      ctx.ws.send(data, cb)
    );
    return this;
  }

  /**
   * Short circuit all remaining middleware
   */
  done() {
    this.isComplete = true;
    return this;
  }

  /**
   * Throw an error
   */
  throw(err: Error) {
    throw err;
  }

  /**
   * True if this activation of the middlware chain is a new connection
   */
  get isConnection() {
    return this.type === 'connection';
  }

  /**
   * True if this activation of the middlware chain is a new message
   */
  get isMessage() {
    return this.type === 'message';
  }

  /**
   * True if this activation of the middlware chain is a closing connection
   */
  get isClosing() {
    return this.type === 'closing';
  }

  /**
   * Object representing the http(s) headers that began this connection
   */
  get requestHeaders() {
    return this.req.headers;
  }

  /**
   * IP Address of the client
   */
  get ip(): string {
    return this.req.connection.remoteAddress;
  }

  /**
   * String URL path that began the connection
   */
  get path(): string {
    return this.req.url;
  }

  /**
   * HTTP method used to begin the connection
   */
  get method(): string {
    return this.req.method;
  }
};
