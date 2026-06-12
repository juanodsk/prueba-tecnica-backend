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
  @IsUUID('4', {
    message: 'ID del comerciante debe ser un UUID valido',
  })
  merchant_id!: string;

  @IsString()
  @Matches(/^(?!0+(?:\.0{1,2})?$)\d{1,10}(?:\.\d{1,2})?$/, {
    message: 'amount debe ser mayor a 0 y tener maximo 2 decimales',
  })
  amount!: string;

  @IsEnum(Currency, {
    message: 'Tipo de moneda debe ser uno de estos valores: GTQ, COP, USD',
  })
  currency!: Currency;

  @IsEnum(TransactionType, {
    message: 'Tipo de transacción debe ser uno de estos valores: payin, payout',
  })
  type!: TransactionType;

  @IsOptional()
  @IsObject({
    message: 'metadata debe ser un objeto valido',
  })
  metadata?: Record<string, unknown>;
}
