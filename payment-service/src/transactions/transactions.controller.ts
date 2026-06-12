import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key/api-key.guard';
import { CurrentMerchant } from '../auth/current-merchant.decorator';
import type { Merchant } from '../generated/prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
@UseGuards(ApiKeyGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @CurrentMerchant() merchant: Merchant,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(merchant, dto);
  }

  @Get()
  findAll(
    @CurrentMerchant() merchant: Merchant,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.transactionsService.findAll(merchant, query);
  }

  @Get(':id')
  findOne(
    @CurrentMerchant() merchant: Merchant,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.transactionsService.findOne(merchant, id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentMerchant() merchant: Merchant,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTransactionStatusDto,
  ) {
    return this.transactionsService.updateStatus(merchant, id, dto);
  }
}
