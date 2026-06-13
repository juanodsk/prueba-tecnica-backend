import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class AdminKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const providedAdminKey = request.header('x-admin-key');
    const configuredAdminKey =
      this.configService.getOrThrow<string>('ADMIN_API_KEY');

    if (
      !providedAdminKey ||
      !this.keysMatch(providedAdminKey, configuredAdminKey)
    ) {
      throw new UnauthorizedException('Admin API key invalida');
    }

    return true;
  }

  private keysMatch(providedKey: string, configuredKey: string): boolean {
    const providedBuffer = Buffer.from(providedKey);
    const configuredBuffer = Buffer.from(configuredKey);

    return (
      providedBuffer.length === configuredBuffer.length &&
      timingSafeEqual(providedBuffer, configuredBuffer)
    );
  }
}
