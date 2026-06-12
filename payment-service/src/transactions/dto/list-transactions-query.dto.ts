import { Type } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  TransactionStatus,
  TransactionType,
} from '../../generated/prisma/enums';

export class ListTransactionsQueryDto {
  @Type(() => Number)
  @IsInt({
    message: 'page debe ser un numero entero',
  })
  @Min(1, {
    message: 'page debe ser mayor o igual a 1',
  })
  page = 1;

  @Type(() => Number)
  @IsInt({
    message: 'limit debe ser un numero entero',
  })
  @Min(1, {
    message: 'limit debe ser mayor o igual a 1',
  })
  @Max(100, {
    message: 'limit no puede ser mayor a 100',
  })
  limit = 20;

  @IsOptional()
  @IsEnum(TransactionStatus, {
    message:
      'Estado de la transacción debe ser uno de estos valores: pending, approved, rejected, failed, completed',
  })
  status?: TransactionStatus;

  @IsOptional()
  @IsEnum(TransactionType, {
    message: 'Tipo de transacción debe ser uno de estos valores: payin, payout',
  })
  type?: TransactionType;

  @IsOptional()
  @IsISO8601(
    { strict: true },
    {
      message: 'Fecha inicio debe ser una fecha valida en formato ISO 8601',
    },
  )
  date_from?: string;

  @IsOptional()
  @IsISO8601(
    { strict: true },
    {
      message: 'Fecha final debe ser una fecha valida en formato ISO 8601',
    },
  )
  date_to?: string;
}
