import { IsEnum } from 'class-validator';
import { TransactionStatus } from '../../generated/prisma/enums';

export class UpdateTransactionStatusDto {
  @IsEnum(TransactionStatus)
  status!: TransactionStatus;
}
