import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type HealthResponse = {
  status: 'ok';
  service: 'payment-service';
  uptime: number;
  database: 'connected';
  timestamp: string;
};

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        service: 'payment-service',
        uptime: Math.floor(process.uptime()),
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'payment-service',
        uptime: Math.floor(process.uptime()),
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
