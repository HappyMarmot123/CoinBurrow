import { AbstractMessageHandler } from './abstract-message.handler';
import { Logger } from '@nestjs/common';
import { CandleDto } from '../candle.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export class CandleHandler extends AbstractMessageHandler {
  private readonly logger = new Logger(CandleHandler.name);

  public async handle(message: any, server: any): Promise<void> {
    if (message.type && message.type.startsWith('candle')) {
      try {
        const candleDto = plainToInstance(CandleDto, message);
        const errors = await validate(candleDto);

        if (errors.length > 0) {
          this.logger.error(
            `Candle 데이터 유효성 검사 실패: ${JSON.stringify(errors)}`,
          );
        } else {
          this.logger.debug(
            `[Upbit WebSocket] Candle 데이터 수신 및 전송: ${candleDto.code}`,
          );
          server.emit('candle', [candleDto]);
        }
      } catch (error) {
        this.logger.error('Candle 데이터 처리 중 오류 발생', error.stack);
      }
    } else {
      await super.handle(message, server);
    }
  }
}
