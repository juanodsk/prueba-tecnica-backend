import { ConflictException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { type Merchant, Prisma } from '../generated/prisma/client';
import { MerchantStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';

const MAX_API_KEY_ATTEMPTS = 5;
const API_KEY_PREFIX = 'api_';

@Injectable()
export class MerchantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMerchantDto): Promise<Merchant> {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();

    for (let attempt = 0; attempt < MAX_API_KEY_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.merchant.create({
          data: {
            name,
            email,
            apiKey: this.generateApiKey(),
            status: MerchantStatus.active,
          },
        });
      } catch (error: unknown) {
        if (this.isUniqueConstraintError(error, 'api_key')) {
          continue;
        }

        if (this.isUniqueConstraintError(error, 'email')) {
          throw new ConflictException('El email ya pertenece a otro merchant');
        }

        throw error;
      }
    }

    throw new ConflictException('No fue posible generar una API key unica');
  }

  private generateApiKey(): string {
    return `${API_KEY_PREFIX}${randomBytes(32).toString('hex')}`;
  }

  private isUniqueConstraintError(error: unknown, field: string): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    return JSON.stringify(error.meta).includes(field);
  }
}
