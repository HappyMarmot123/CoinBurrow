import { AbstractMessageHandler } from './abstract-message.handler';
import { Logger } from '@nestjs/common';
import { OrderbookDto } from '../orderbook.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export class OrderbookHandler extends AbstractMessageHandler {
  private readonly logger = new Logger(OrderbookHandler.name);

  public async handle(message: any, server: any): Promise<void> {
    if (message.type === 'orderbook') {
      try {
        const orderbookDto = plainToInstance(OrderbookDto, message);
        const errors = await validate(orderbookDto);

        if (errors.length > 0) {
          this.logger.error(
            `Orderbook 데이터 유효성 검사 실패: ${JSON.stringify(errors)}`,
          );
        } else {
          this.logger.debug(
            `[Upbit WebSocket] Orderbook 데이터 수신 및 전송: ${orderbookDto.code}`,
          );
          server.emit('orderbook', orderbookDto);
        }
      } catch (error) {
        this.logger.error('Orderbook 데이터 처리 중 오류 발생', error.stack);
      }
    } else {
      await super.handle(message, server);
    }
  }
}
