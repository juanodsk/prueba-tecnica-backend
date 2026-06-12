import { IsISO8601, IsUUID } from 'class-validator';

export class GenerateSettlementDto {
  @IsUUID('4', {
    message: 'merchant_id debe ser un UUID v4 valido',
  })
  merchant_id!: string;

  @IsISO8601(
    { strict: true },
    {
      message:
        'Comienzo del periodo debe ser una fecha valida en formato ISO 8601',
    },
  )
  period_start!: string;

  @IsISO8601(
    { strict: true },
    {
      message:
        'Final del periodo debe ser una fecha valida en formato ISO 8601',
    },
  )
  period_end!: string;
}
