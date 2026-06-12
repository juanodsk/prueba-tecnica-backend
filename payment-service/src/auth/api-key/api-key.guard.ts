import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MerchantStatus } from '../../generated/prisma/enums';
import type { AuthenticatedRequest } from '../authenticated-request.type';
import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = request.header('x-api-key');

    if (!apiKey) {
      throw new UnauthorizedException('API key requerida');
    }

    const merchant = await this.authService.findMerchantByApiKey(apiKey);

    if (!merchant) {
      throw new UnauthorizedException('API key invalida');
    }

    if (merchant.status === MerchantStatus.inactive) {
      throw new ForbiddenException('Merchant inactivo');
    }

    request.merchant = merchant;

    return true;
  }
}
