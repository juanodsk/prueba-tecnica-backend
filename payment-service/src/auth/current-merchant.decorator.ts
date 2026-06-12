import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Merchant } from '../generated/prisma/client';
import type { AuthenticatedRequest } from './authenticated-request.type';

export const CurrentMerchant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Merchant => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.merchant;
  },
);
