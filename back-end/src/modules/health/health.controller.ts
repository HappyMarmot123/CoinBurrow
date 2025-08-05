import { Body, Controller, Get, Post } from '@nestjs/common';
import { HealthService } from './domain/services/health.service';
import { CreateHealthDto } from './application/dto/create-health.dto';
import { Health } from './application/entities/health.entity';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  findAll(): Health[] {
    return this.healthService.findAll();
  }

  @Post()
  create(@Body() createHealthDto: CreateHealthDto): Health {
    return this.healthService.create(createHealthDto);
  }
}
