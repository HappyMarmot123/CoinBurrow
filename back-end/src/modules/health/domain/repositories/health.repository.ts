import { Health } from '../../application/entities/health.entity';

export interface HealthRepository {
  create(health: Health): Promise<Health>;
  findAll(): Promise<Health[]>;
}

export const HEALTH_REPOSITORY = Symbol('HEALTH_REPOSITORY');
