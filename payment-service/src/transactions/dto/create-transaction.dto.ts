import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { Currency, TransactionType } from '../../generated/prisma/enums';

export class CreateTransactionDto {
  @IsUUID()
  merchant_id!: string;

  @IsString()
  @Matches(/^(?!0+(?:\.0{1,2})?$)\d{1,10}(?:\.\d{1,2})?$/, {
    message: 'amount debe ser mayor a 0 y tener maximo 2 decimales',
  })
  amount!: string;

  @IsEnum(Currency)
  currency!: Currency;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
