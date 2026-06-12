import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../auth/api-key/api-key.guard';
import { CurrentMerchant } from '../auth/current-merchant.decorator';
import type { Merchant } from '../generated/prisma/client';
import { GenerateSettlementDto } from './dto/generate-settlement.dto';
import { SettlementsService } from './settlements.service';

@Controller('settlements')
@UseGuards(ApiKeyGuard)
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Post('generate')
  generate(
    @CurrentMerchant() merchant: Merchant,
    @Body() dto: GenerateSettlementDto,
  ) {
    return this.settlementsService.generate(merchant, dto);
  }

  @Get(':id')
  findOne(
    @CurrentMerchant() merchant: Merchant,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.settlementsService.findOne(merchant, id);
  }
}
