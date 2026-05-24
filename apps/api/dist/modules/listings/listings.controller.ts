// apps/api/src/modules/listings/listings.controller.ts
import {
  Controller, Get, Post, Delete,
  Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateListingDto } from './dto/create-listing.dto';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  // ── Public browse ─────────────────────────────────────────────────────────
  @Get()
  findAll(@Query() query: any) {
    return this.listingsService.findAll(query);
  }

  // ── Dropdown cascade endpoints ────────────────────────────────────────────
  // GET /listings/makes                      → all car makes
  // GET /listings/makes/:makeId/models       → models for a brand
  // GET /listings/models/:modelId/trims?year → trims for a model (+ optional year)

  @Get('makes')
  getMakes() {
    return this.listingsService.getMakes();
  }

  @Get('makes/:makeId/models')
  getModelsByMake(@Param('makeId') makeId: string) {
    return this.listingsService.getModelsByMake(makeId);
  }

  @Get('models/:modelId/trims')
  getTrimsByModel(
    @Param('modelId') modelId: string,
    @Query('year') year?: string,
  ) {
    return this.listingsService.getTrimsByModel(modelId, year ? Number(year) : undefined);
  }

  // ── Single listing ────────────────────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }

  // ── Auth-protected ────────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('my/listings')
  myListings(@Request() req: any) {
    return this.listingsService.myListings(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() dto: CreateListingDto) {
    return this.listingsService.create({ ...dto, userId: req.user.userId });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: any) {
    return this.listingsService.delete(id, req.user.userId);
  }
}
