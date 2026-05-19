import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  getUsers(@Query('page') page: string, @Query('limit') limit: string) {
    return this.adminService.getAllUsers(Number(page ?? 1), Number(limit ?? 20));
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

  @Get('reports')
  getReports() {
    return this.adminService.getReports();
  }
}
