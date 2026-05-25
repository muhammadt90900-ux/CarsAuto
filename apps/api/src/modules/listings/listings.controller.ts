// apps/api/src/modules/listings/listings.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, Request,
  ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateListingDto } from './dto/create-listing.dto';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  /** GET /listings — public paginated list with filters */
  @Get()
  findAll(@Query() query: any) {
    return this.listingsService.findAll(query);
  }

  /** GET /listings/my — authenticated user's own listings */
  @UseGuards(JwtAuthGuard)
  @Get('my')
  myListings(@Request() req: any) {
    return this.listingsService.myListings(req.user.userId);
  }

  /** GET /listings/:id — single listing detail + view increment */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.listingsService.findOne(id);
  }

  /** POST /listings — create a new listing */
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() dto: CreateListingDto) {
    return this.listingsService.create({ ...dto, userId: req.user.userId });
  }

  /** PATCH /listings/:id — partial update (owner only) */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: Partial<CreateListingDto>,
  ) {
    return this.listingsService.update(id, req.user.userId, dto);
  }

  /** DELETE /listings/:id — soft or hard delete (owner only) */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.listingsService.delete(id, req.user.userId);
  }
}
