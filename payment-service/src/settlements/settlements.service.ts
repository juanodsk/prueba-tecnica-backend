import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Merchant,
  Prisma,
  type Transaction,
} from '../generated/prisma/client';
import { SettlementStatus, TransactionStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateSettlementDto } from './dto/generate-settlement.dto';

const settlementBatchDetails = {
  include: {
    settlements: {
      orderBy: {
        currency: 'asc',
      },
      include: {
        settlementTransactions: {
          include: {
            transaction: true,
          },
        },
      },
    },
  },
} satisfies Prisma.SettlementBatchDefaultArgs;

type SettlementBatchDetails = Prisma.SettlementBatchGetPayload<
  typeof settlementBatchDetails
>;

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    merchant: Merchant,
    dto: GenerateSettlementDto,
  ): Promise<SettlementBatchDetails> {
    this.validateMerchantOwnership(merchant, dto.merchant_id);

    const periodStart = new Date(dto.period_start);
    const periodEnd = new Date(dto.period_end);

    this.validateDateRange(periodStart, periodEnd);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const transactions = await tx.transaction.findMany({
            where: {
              merchantId: merchant.id,
              status: TransactionStatus.approved,
              createdAt: {
                gte: periodStart,
                lte: periodEnd,
              },
              settlementTransaction: null,
            },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          });

          if (transactions.length === 0) {
            throw new NotFoundException(
              'No existen transacciones elegibles para generar la liquidacion',
            );
          }

          const batch = await tx.settlementBatch.create({
            data: {
              merchantId: merchant.id,
              transactionCount: transactions.length,
              status: SettlementStatus.pending,
              periodStart,
              periodEnd,
            },
          });

          const transactionsByCurrency = this.groupByCurrency(transactions);

          for (const [
            currency,
            currencyTransactions,
          ] of transactionsByCurrency) {
            const totalAmount = currencyTransactions.reduce(
              (total, transaction) => total.plus(transaction.amount),
              new Prisma.Decimal(0),
            );

            const settlement = await tx.settlement.create({
              data: {
                batchId: batch.id,
                merchantId: merchant.id,
                currency,
                totalAmount,
                transactionCount: currencyTransactions.length,
                status: SettlementStatus.pending,
                periodStart,
                periodEnd,
              },
            });

            await tx.settlementTransaction.createMany({
              data: currencyTransactions.map((transaction) => ({
                settlementId: settlement.id,
                transactionId: transaction.id,
              })),
            });
          }

          return tx.settlementBatch.findUniqueOrThrow({
            where: {
              id: batch.id,
            },
            ...settlementBatchDetails,
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      ) {
        throw new ConflictException(
          'Una o mas transacciones ya fueron liquidadas por otra solicitud',
        );
      }

      throw error;
    }
  }

  async findOne(
    merchant: Merchant,
    id: string,
  ): Promise<SettlementBatchDetails> {
    const settlementBatch = await this.prisma.settlementBatch.findFirst({
      where: {
        id,
        merchantId: merchant.id,
      },
      ...settlementBatchDetails,
    });

    if (!settlementBatch) {
      throw new NotFoundException('Liquidacion no encontrada');
    }

    return settlementBatch;
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

  private validateDateRange(periodStart: Date, periodEnd: Date): void {
    if (periodStart > periodEnd) {
      throw new BadRequestException(
        'period_start no puede ser posterior a period_end',
      );
    }
  }

  private groupByCurrency(
    transactions: Transaction[],
  ): Map<Transaction['currency'], Transaction[]> {
    const transactionsByCurrency = new Map<
      Transaction['currency'],
      Transaction[]
    >();

    for (const transaction of transactions) {
      const currencyTransactions =
        transactionsByCurrency.get(transaction.currency) ?? [];

      currencyTransactions.push(transaction);
      transactionsByCurrency.set(transaction.currency, currencyTransactions);
    }

    return transactionsByCurrency;
  }
}
