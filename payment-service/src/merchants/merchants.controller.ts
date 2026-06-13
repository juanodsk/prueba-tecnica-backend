import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from './admin-key.guard';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { MerchantsService } from './merchants.service';

@Controller('merchants')
@UseGuards(AdminKeyGuard)
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  create(@Body() dto: CreateMerchantDto) {
    return this.merchantsService.create(dto);
  }
}
