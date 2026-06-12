import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import {
  type Merchant,
  Prisma,
  type Transaction,
} from '../generated/prisma/client';
import { TransactionStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';

const MAX_REFERENCE_ATTEMPTS = 5;
const REFERENCE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const VALID_TRANSITIONS: Record<
  TransactionStatus,
  readonly TransactionStatus[]
> = {
  pending: [
    TransactionStatus.approved,
    TransactionStatus.rejected,
    TransactionStatus.failed,
  ],
  approved: [TransactionStatus.completed, TransactionStatus.failed],
  rejected: [],
  failed: [],
  completed: [],
};

type PaginatedTransactions = {
  data: Transaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
};

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    merchant: Merchant,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    this.validateMerchantOwnership(merchant, dto.merchant_id);

    for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt += 1) {
      try {
        return await this.prisma.transaction.create({
          data: {
            merchantId: merchant.id,
            amount: dto.amount,
            currency: dto.currency,
            type: dto.type,
            status: TransactionStatus.pending,
            reference: this.generateReference(),
            ...(dto.metadata
              ? { metadata: dto.metadata as Prisma.InputJsonValue }
              : {}),
          },
        });
      } catch (error: unknown) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }

        throw error;
      }
    }

    throw new ConflictException('No fue posible generar una referencia unica');
  }

  async findAll(
    merchant: Merchant,
    query: ListTransactionsQueryDto,
  ): Promise<PaginatedTransactions> {
    this.validateDateRange(query.date_from, query.date_to);

    const where: Prisma.TransactionWhereInput = {
      merchantId: merchant.id,
      status: query.status,
      type: query.type,
      createdAt:
        query.date_from || query.date_to
          ? {
              gte: query.date_from ? new Date(query.date_from) : undefined,
              lte: query.date_to ? new Date(query.date_to) : undefined,
            }
          : undefined,
    };

    const skip = (query.page - 1) * query.limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(merchant: Merchant, id: string): Promise<Transaction> {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id,
        merchantId: merchant.id,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaccion no encontrada');
    }

    return transaction;
  }

  async updateStatus(
    merchant: Merchant,
    id: string,
    dto: UpdateTransactionStatusDto,
  ): Promise<Transaction> {
    const transaction = await this.findOne(merchant, id);
    const allowedStatuses = VALID_TRANSITIONS[transaction.status];

    if (!allowedStatuses.includes(dto.status)) {
      throw new UnprocessableEntityException(
        `Transicion de estado invalida: no se puede cambiar de '${transaction.status}' a '${dto.status}'`,
      );
    }

    const result = await this.prisma.transaction.updateMany({
      where: {
        id: transaction.id,
        merchantId: merchant.id,
        status: transaction.status,
      },
      data: {
        status: dto.status,
      },
    });

    if (result.count === 0) {
      throw new ConflictException(
        'El estado de la transaccion cambio durante la operacion',
      );
    }

    return this.findOne(merchant, id);
  }

  private validateMerchantOwnership(
    merchant: Merchant,
    merchantId: string,
  ): void {
    if (merchant.id !== merchantId) {
      throw new ForbiddenException(
        'merchant_id no corresponde al merchant autenticado',
      );
    }
  }

  private validateDateRange(dateFrom?: string, dateTo?: string): void {
    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser mayor a la fecha de fin',
      );
    }
  }

  private generateReference(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');

    const suffix = Array.from(
      { length: 6 },
      () => REFERENCE_CHARACTERS[randomInt(REFERENCE_CHARACTERS.length)],
    ).join('');

    return `TXN-${date}-${suffix}`;
  }
}
