export interface MessageHandler {
  setNext(handler: MessageHandler): MessageHandler;
  handle(message: any, server: any): Promise<void>;
}

export abstract class AbstractMessageHandler implements MessageHandler {
  private nextHandler: MessageHandler;

  public setNext(handler: MessageHandler): MessageHandler {
    this.nextHandler = handler;
    return handler;
  }

  public async handle(message: any, server: any): Promise<void> {
    if (this.nextHandler) {
      await this.nextHandler.handle(message, server);
    }
  }
}
