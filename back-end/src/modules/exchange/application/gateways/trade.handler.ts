import { AbstractMessageHandler } from './abstract-message.handler';
import { Logger } from '@nestjs/common';
import { TradeDto } from '../trade.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export class TradeHandler extends AbstractMessageHandler {
  private readonly logger = new Logger(TradeHandler.name);

  public async handle(message: any, server: any): Promise<void> {
    if (message.type === 'trade') {
      try {
        const tradeDto = plainToInstance(TradeDto, message);
        const errors = await validate(tradeDto);

        if (errors.length > 0) {
          this.logger.error(
            `Trade 데이터 유효성 검사 실패: ${JSON.stringify(errors)}`,
          );
        } else {
          this.logger.debug(
            `[Upbit WebSocket] Trade 데이터 수신 및 전송: ${tradeDto.code}`,
          );
          server.emit('trade', tradeDto);
        }
      } catch (error) {
        this.logger.error('Trade 데이터 처리 중 오류 발생', error.stack);
      }
    } else {
      await super.handle(message, server);
    }
  }
}
