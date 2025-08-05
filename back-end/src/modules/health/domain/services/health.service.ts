import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateHealthDto } from '../../application/dto/create-health.dto';
import { Health } from '../../application/entities/health.entity';
import { HealthValidator } from '../validators/health.validator';

@Injectable()
export class HealthService {
  // In-memory storage for demonstration purposes
  private readonly healthChecks: Health[] = [new Health('ok', 'initial')];

  constructor(private readonly healthValidator: HealthValidator) {}

  create(createHealthDto: CreateHealthDto): Health {
    if (
      createHealthDto.serviceName &&
      !this.healthValidator.validateServiceName(createHealthDto.serviceName)
    ) {
      throw new BadRequestException('Invalid service name');
    }
    const newHealth = new Health(
      createHealthDto.status,
      createHealthDto.serviceName,
    );
    this.healthChecks.push(newHealth);
    return newHealth;
  }

  findAll(): Health[] {
    return this.healthChecks;
  }

  getHello(): string {
    return 'Hello World!';
  }
}
