import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './domain/services/health.service';
import { HealthValidator } from './domain/validators/health.validator';

@Module({
  imports: [],
  controllers: [HealthController],
  providers: [
    HealthService,
    HealthValidator,
    // {
    //   provide: HEALTH_REPOSITORY,
    //   useClass: InMemoryHealthRepository
    // },
  ],
})
export class HealthModule {}
