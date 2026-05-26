import {
  Controller, Get, Post, Patch, Delete,
  Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
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
    return this.adminService.getAllUsers(Number(page ?? 1), Number(limit ?? 20), search);
  }

  @Patch('users/:id/ban')
  banUser(@Param('id') id: string, @Body('banned') banned: boolean) {
    return this.adminService.banUser(id, banned);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
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
    return this.adminService.getAllListings(Number(page ?? 1), Number(limit ?? 20), status, search);
  }

  @Get('listings/pending')
  getPending() {
    return this.adminService.getPendingListings();
  }

  @Patch('listings/:id/approve')
  approve(@Param('id') id: string) {
    return this.adminService.approveListing(id);
  }

  @Patch('listings/:id/reject')
  reject(@Param('id') id: string) {
    return this.adminService.rejectListing(id);
  }

  @Delete('listings/:id')
  deleteListing(@Param('id') id: string) {
    return this.adminService.deleteListing(id);
  }

  // ── Featured Listings ──────────────────────────────────────────────────
  @Get('featured')
  getFeatured() {
    return this.adminService.getFeaturedListings();
  }

  @Patch('listings/:id/featured')
  setFeatured(
    @Param('id') id: string,
    @Body('featured') featured: boolean,
    @Body('featuredUntil') featuredUntil?: string,
  ) {
    return this.adminService.setFeatured(id, featured, featuredUntil ? new Date(featuredUntil) : undefined);
  }

  // ── Reports ────────────────────────────────────────────────────────────
  @Get('reports')
  getReports(@Query('page') page: string, @Query('limit') limit: string) {
    return this.adminService.getReports(Number(page ?? 1), Number(limit ?? 20));
  }

  @Patch('reports/:id/resolve')
  resolveReport(@Param('id') id: string, @Body('action') action: 'resolved' | 'dismissed') {
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
    @Param('id') id: string,
    @Body() body: { name?: string; slug?: string; icon?: string; order?: number },
  ) {
    return this.adminService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
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
  deleteTranslation(@Param('id') id: string) {
    return this.adminService.deleteTranslation(id);
  }

  // ── Ads ────────────────────────────────────────────────────────────────
  @Get('ads')
  getAds(@Query('page') page: string, @Query('limit') limit: string) {
    return this.adminService.getAds(Number(page ?? 1), Number(limit ?? 20));
  }

  @Post('ads')
  createAd(@Body() body: { title: string; imageUrl: string; linkUrl: string; placement: string; startsAt?: string; endsAt?: string }) {
    return this.adminService.createAd({
      ...body,
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
    });
  }

  @Patch('ads/:id')
  updateAd(@Param('id') id: string, @Body() body: any) {
    return this.adminService.updateAd(id, body);
  }

  @Delete('ads/:id')
  deleteAd(@Param('id') id: string) {
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
