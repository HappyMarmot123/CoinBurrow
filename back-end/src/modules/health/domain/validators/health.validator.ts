import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthValidator {
  private readonly allowedServiceNames = ['core', 'payment', 'notification'];

  validateServiceName(serviceName: string): boolean {
    if (!serviceName) {
      return true; // Optional field
    }
    return this.allowedServiceNames.includes(serviceName);
  }
}
