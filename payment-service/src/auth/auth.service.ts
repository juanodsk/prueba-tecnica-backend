import { Injectable } from '@nestjs/common';
import type { Merchant } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  findMerchantByApiKey(apiKey: string): Promise<Merchant | null> {
    return this.prisma.merchant.findUnique({
      where: { apiKey },
    });
  }
}
