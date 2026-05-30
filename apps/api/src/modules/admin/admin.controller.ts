import {
  Controller, Get, Post, Patch, Delete,
  Param, Query, Body, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

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
  ) {
    const p = Math.max(1, Number(page ?? 1));
    const l = Math.min(100, Math.max(1, Number(limit ?? 20)));
    return this.adminService.getAllUsers(p, l, search);
  }

  @Patch('users/:id/ban')
  banUser(@Param('id', ParseUUIDPipe) id: string, @Body('banned') banned: boolean) {
    return this.adminService.banUser(id, banned);
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
  getPending() {
    return this.adminService.getPendingListings();
  }

  @Patch('listings/:id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.approveListing(id);
  }

  @Patch('listings/:id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.rejectListing(id);
  }

  @Delete('listings/:id')
  deleteListing(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteListing(id);
  }

  // ── Featured Listings ──────────────────────────────────────────────────
  @Get('featured')
  getFeatured() {
    return this.adminService.getFeaturedListings();
  }

  @Patch('listings/:id/featured')
  setFeatured(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('featured') featured: boolean,
    @Body('featuredUntil') featuredUntil?: string,
  ) {
    // FIX: Validate date string before parsing to prevent invalid Date injection
    let parsedDate: Date | undefined;
    if (featuredUntil) {
      parsedDate = new Date(featuredUntil);
      if (isNaN(parsedDate.getTime())) parsedDate = undefined;
    }
    return this.adminService.setFeatured(id, featured, parsedDate);
  }

  // ── Reports ────────────────────────────────────────────────────────────
  @Get('reports')
  getReports(@Query('page') page: string, @Query('limit') limit: string) {
    const p = Math.max(1, Number(page ?? 1));
    const l = Math.min(100, Math.max(1, Number(limit ?? 20)));
    return this.adminService.getReports(p, l);
  }

  @Patch('reports/:id/resolve')
  resolveReport(@Param('id', ParseUUIDPipe) id: string, @Body('action') action: 'resolved' | 'dismissed') {
    if (!['resolved', 'dismissed'].includes(action)) {
      action = 'dismissed';
    }
    return this.adminService.resolveReport(id, action);
  }

  // ── Categories ─────────────────────────────────────────────────────────
  @Get('categories')
  getCategories() {
    return this.adminService.getCategories();
  }

  @Post('categories')
  createCategory(@Body() body: { name: string; slug: string; icon?: string; parentId?: string }) {
    return this.adminService.createCategory(body);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { name?: string; slug?: string; icon?: string; order?: number },
  ) {
    return this.adminService.updateCategory(id, body);
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
  upsertTranslation(@Body() body: { locale: string; key: string; value: string }) {
    return this.adminService.upsertTranslation(body.locale, body.key, body.value);
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
  createAd(@Body() body: { title: string; imageUrl: string; linkUrl: string; placement: string; startsAt?: string; endsAt?: string }) {
    // FIX: Validate date strings before parsing
    let startsAt: Date | undefined;
    let endsAt: Date | undefined;
    if (body.startsAt) {
      startsAt = new Date(body.startsAt);
      if (isNaN(startsAt.getTime())) startsAt = undefined;
    }
    if (body.endsAt) {
      endsAt = new Date(body.endsAt);
      if (isNaN(endsAt.getTime())) endsAt = undefined;
    }
    return this.adminService.createAd({ ...body, startsAt, endsAt });
  }

  @Patch('ads/:id')
  updateAd(@Param('id', ParseUUIDPipe) id: string, @Body() body: Partial<{ title: string; imageUrl: string; linkUrl: string; placement: string; active: boolean }>) {
    // FIX: Removed @Body() body: any — now typed, no arbitrary fields accepted
    return this.adminService.updateAd(id, body);
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
  upsertSetting(@Body() body: { key: string; value: string }) {
    return this.adminService.upsertSetting(body.key, body.value);
  }
}
