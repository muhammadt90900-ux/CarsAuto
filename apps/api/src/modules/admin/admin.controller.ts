import {
  Controller, Get, Post, Patch, Delete,
  Param, Query, Body, UseGuards, ParseUUIDPipe, Request,
} from '@nestjs/common';
import {
  IsString, IsOptional, IsBoolean, MaxLength,
  IsUrl, Matches, IsDateString, IsIn,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

// ── Admin DTOs — enforce strict typing on all mutable bodies ─────────────────

class CreateCategoryDto {
  @IsString() @MaxLength(100) nameEn!: string;
  @IsString() @MaxLength(100) nameKu!: string;
  @IsString() @MaxLength(100) nameAr!: string;
  @IsString() @MaxLength(100) nameZh!: string;
  @IsString() @MaxLength(100) @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' }) slug!: string;
  @IsOptional() @IsString() @MaxLength(10) icon?: string;
  @IsOptional() @IsUUID()    parentId?: string;
}

class UpdateCategoryDto {
  @IsOptional() @IsString() @MaxLength(100) nameEn?: string;
  @IsOptional() @IsString() @MaxLength(100) nameKu?: string;
  @IsOptional() @IsString() @MaxLength(100) nameAr?: string;
  @IsOptional() @IsString() @MaxLength(100) nameZh?: string;
  @IsOptional() @IsString() @MaxLength(100) @Matches(/^[a-z0-9-]+$/) slug?: string;
  @IsOptional() @IsString() @MaxLength(10)  icon?: string;
}

class UpsertTranslationDto {
  @IsString() @MaxLength(10)   locale!: string;
  @IsString() @MaxLength(50)   namespace!: string;
  @IsString() @MaxLength(200)  key!: string;
  @IsString() @MaxLength(2000) value!: string;
}

class UpsertSettingDto {
  @IsString() @MaxLength(100)  key!: string;
  @IsString() @MaxLength(2000) value!: string;
}

class CreateAdDto {
  @IsString()  @MaxLength(120)                    title!: string;
  @IsUrl({ protocols: ['https'], require_tld: true }) @MaxLength(2048) imageUrl!: string;
  @IsUrl({ protocols: ['https', 'http'], require_tld: true }) @MaxLength(2048) linkUrl!: string;
  @IsString()  @MaxLength(40)                     placement!: string;
  @IsOptional() @IsDateString()                   startsAt?: string;
  @IsOptional() @IsDateString()                   endsAt?: string;
}

class UpdateAdDto {
  @IsOptional() @IsString()  @MaxLength(120)      title?: string;
  @IsOptional() @IsUrl({ protocols: ['https'], require_tld: true }) @MaxLength(2048) imageUrl?: string;
  @IsOptional() @IsUrl({ protocols: ['https', 'http'], require_tld: true }) @MaxLength(2048) linkUrl?: string;
  @IsOptional() @IsString()  @MaxLength(40)       placement?: string;
  @IsOptional() @IsBoolean() @Transform(({ value }) => value === true || value === 'true') active?: boolean;
}

class BanUserDto {
  @IsBoolean() @Transform(({ value }) => value === true || value === 'true') banned!: boolean;
}

class SuspendUserDto {
  // ISO date string for when the suspension lifts. Omit/null to lift early.
  @IsOptional() @IsDateString() until?: string;
  @IsOptional() @IsString() @MaxLength(255) reason?: string;
}

class SetRoleDto {
  @IsIn(['USER', 'DEALER', 'ADMIN'])
  role!: 'USER' | 'DEALER' | 'ADMIN';
}

class ResolveReportDto {
  @IsIn(['resolved', 'dismissed']) action!: 'resolved' | 'dismissed';
}

class SetFeaturedDto {
  @IsBoolean() @Transform(({ value }) => value === true || value === 'true') featured!: boolean;
  @IsOptional() @IsDateString() featuredUntil?: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)   // FIX: AdminGuard added — was missing entirely
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard ──────────────────────────────────────────────────────────
  @Get('stats')
  getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('analytics')
  getAnalytics() {
    return this.adminService.getAnalyticsCharts();
  }

  // ── Users ──────────────────────────────────────────────────────────────
  @Get('users')
  getUsers(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    const p = Math.max(1, Number(page ?? 1));
    const l = Math.min(100, Math.max(1, Number(limit ?? 20)));
    return this.adminService.getAllUsers(p, l, search, role, status);
  }

  @Get('users/:id')
  getUserDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id/ban')
  banUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BanUserDto,
    @Request() req: any,
  ) {
    return this.adminService.banUser(id, dto.banned, req.user?.userId);
  }

  @Patch('users/:id/suspend')
  suspendUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
    @Request() req: any,
  ) {
    let until: Date | null = null;
    if (dto.until) {
      const parsed = new Date(dto.until);
      until = isNaN(parsed.getTime()) ? null : parsed;
    }
    return this.adminService.suspendUser(id, until, dto.reason, req.user?.userId);
  }

  @Patch('users/:id/role')
  setUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRoleDto,
    @Request() req: any,
  ) {
    return this.adminService.setUserRole(id, dto.role, req.user?.userId);
  }

  @Delete('users/:id')
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteUser(id);
  }

  // ── Listings ───────────────────────────────────────────────────────────
  @Get('listings')
  getListings(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, Number(page ?? 1));
    const l = Math.min(100, Math.max(1, Number(limit ?? 20)));
    return this.adminService.getAllListings(p, l, status, search);
  }

  @Get('listings/pending')
  getPending(
    @Query('page')  page?:  string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, Number(page  ?? 1));
    const l = Math.min(100, Math.max(1, Number(limit ?? 20)));
    return this.adminService.getPendingListings(p, l);
  }

  @Patch('listings/:id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.adminService.approveListing(id, req.user?.userId);
  }

  @Patch('listings/:id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.adminService.rejectListing(id, req.user?.userId);
  }

  @Delete('listings/:id')
  deleteListing(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.adminService.deleteListing(id, req.user?.userId);
  }

  // ── Featured Listings ──────────────────────────────────────────────────
  @Get('featured')
  getFeatured() {
    return this.adminService.getFeaturedListings();
  }

  @Patch('listings/:id/featured')
  setFeatured(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetFeaturedDto,
  ) {
    let parsedDate: Date | undefined;
    if (dto.featuredUntil) {
      parsedDate = new Date(dto.featuredUntil);
      if (isNaN(parsedDate.getTime())) parsedDate = undefined;
    }
    return this.adminService.setFeatured(id, dto.featured, parsedDate);
  }

  // ── Reports ────────────────────────────────────────────────────────────
  @Get('reports')
  getReports(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    const p = Math.max(1, Number(page ?? 1));
    const l = Math.min(100, Math.max(1, Number(limit ?? 20)));
    return this.adminService.getReports(p, l, status, type);
  }

  @Patch('reports/:id/resolve')
  resolveReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveReportDto,
    @Request() req: any,
  ) {
    return this.adminService.resolveReport(id, dto.action, req.user?.userId);
  }

  // ── Categories ─────────────────────────────────────────────────────────
  @Get('categories')
  getCategories() {
    return this.adminService.getCategories();
  }

  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.adminService.createCategory(dto);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.adminService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteCategory(id);
  }

  // ── Translations ───────────────────────────────────────────────────────
  @Get('translations')
  getTranslations(@Query('locale') locale?: string) {
    return this.adminService.getTranslations(locale);
  }

  @Post('translations')
  upsertTranslation(@Body() dto: UpsertTranslationDto) {
    return this.adminService.upsertTranslation(dto.locale, dto.namespace, dto.key, dto.value);
  }

  @Delete('translations/:id')
  deleteTranslation(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteTranslation(id);
  }

  // ── Ads ────────────────────────────────────────────────────────────────
  @Get('ads')
  getAds(@Query('page') page: string, @Query('limit') limit: string) {
    const p = Math.max(1, Number(page ?? 1));
    const l = Math.min(100, Math.max(1, Number(limit ?? 20)));
    return this.adminService.getAds(p, l);
  }

  @Post('ads')
  createAd(@Body() dto: CreateAdDto) {
    let startsAt: Date | undefined;
    let endsAt: Date | undefined;
    if (dto.startsAt) {
      startsAt = new Date(dto.startsAt);
      if (isNaN(startsAt.getTime())) startsAt = undefined;
    }
    if (dto.endsAt) {
      endsAt = new Date(dto.endsAt);
      if (isNaN(endsAt.getTime())) endsAt = undefined;
    }
    return this.adminService.createAd({ ...dto, startsAt, endsAt });
  }

  @Patch('ads/:id')
  updateAd(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAdDto) {
    return this.adminService.updateAd(id, dto);
  }

  @Delete('ads/:id')
  deleteAd(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteAd(id);
  }

  // ── System Settings ────────────────────────────────────────────────────
  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Post('settings')
  upsertSetting(@Body() dto: UpsertSettingDto) {
    return this.adminService.upsertSetting(dto.key, dto.value);
  }

  // ── Audit Logs ────────────────────────────────────────────────────────────
  @Get('audit-logs')
  getAuditLogs(
    @Query('page')     page?:     string,
    @Query('limit')    limit?:    string,
    @Query('action')   action?:   string,
    @Query('severity') severity?: string,
    @Query('from')     from?:     string,
    @Query('to')       to?:       string,
  ) {
    return this.adminService.getAuditLogs(
      page     ? parseInt(page,  10) : 1,
      limit    ? parseInt(limit, 10) : 50,
      action,
      severity,
      from ? new Date(from) : undefined,
      to   ? new Date(to)   : undefined,
    );
  }

  // ── Dealers ─────────────────────────────────────────────────────────────
  // NOTE: verify / suspend actions live on DealersController
  // (PATCH /dealers/:id/verify, PATCH /dealers/:id/suspend) — both already
  // guarded by JwtAuthGuard + AdminGuard. These routes add the admin-only
  // list (all statuses) and the reject action that controller lacks.
  @Get('dealers')
  getDealers(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, Number(page ?? 1));
    const l = Math.min(100, Math.max(1, Number(limit ?? 20)));
    return this.adminService.getAllDealers(p, l, status, search);
  }

  @Patch('dealers/:id/reject')
  rejectDealer(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.adminService.rejectDealer(id, req.user?.userId);
  }

  // ── Transactions ────────────────────────────────────────────────────────
  @Get('transactions')
  getTransactions(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status?: string,
    @Query('gateway') gateway?: string,
    @Query('search') search?: string,
  ) {
    const p = Math.max(1, Number(page ?? 1));
    const l = Math.min(100, Math.max(1, Number(limit ?? 20)));
    return this.adminService.getTransactions(p, l, status, gateway, search);
  }

  @Get('transactions/:id')
  getTransactionDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getTransactionDetail(id);
  }

  // ── Subscriptions ───────────────────────────────────────────────────────
  @Get('subscriptions/dealers')
  getDealerSubscriptions(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status?: string,
    @Query('plan') plan?: string,
  ) {
    const p = Math.max(1, Number(page ?? 1));
    const l = Math.min(100, Math.max(1, Number(limit ?? 20)));
    return this.adminService.getDealerSubscriptions(p, l, status, plan);
  }

  @Get('subscriptions/users')
  getUserSubscriptions(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status?: string,
  ) {
    const p = Math.max(1, Number(page ?? 1));
    const l = Math.min(100, Math.max(1, Number(limit ?? 20)));
    return this.adminService.getUserSubscriptions(p, l, status);
  }
}
