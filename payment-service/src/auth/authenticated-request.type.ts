import type { Request } from 'express';
import type { Merchant } from '../generated/prisma/client';

export type AuthenticatedRequest = Request & {
  merchant: Merchant;
};
