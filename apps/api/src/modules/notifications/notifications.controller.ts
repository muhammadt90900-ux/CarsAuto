import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** All notifications for the current user (newest first, max 50) */
  @Get()
  getAll(@Request() req: any) {
    return this.notificationsService.getMyNotifications(req.user.userId);
  }

  /** Total unread notification count */
  @Get('unread-count')
  unreadCount(@Request() req: any) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  /** Mark a single notification as read */
  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markOneRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markOneRead(id, req.user.userId);
  }

  /** Mark every notification as read */
  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.userId);
  }

  /** Delete (dismiss) a single notification */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteOne(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.deleteOne(id, req.user.userId);
  }

  // ---------------------------------------------------------------------------
  // Push subscription (Web Push / PWA)
  // ---------------------------------------------------------------------------

  /** Register a browser push subscription for the current user */
  @Post('push/subscribe')
  subscribePush(@Request() req: any, @Body() body: { subscription: object }) {
    return this.notificationsService.savePushSubscription(req.user.userId, body.subscription);
  }

  /** Unregister a browser push subscription */
  @Delete('push/subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsubscribePush(@Request() req: any, @Body() body: { endpoint: string }) {
    return this.notificationsService.removePushSubscription(req.user.userId, body.endpoint);
  }

  // ---------------------------------------------------------------------------
  // Saved-search & favourite alerts preferences
  // ---------------------------------------------------------------------------

  /** Update alert preferences (email / push toggles) */
  @Patch('preferences')
  updatePreferences(
    @Request() req: any,
    @Body()
    body: {
      emailEnabled?: boolean;
      pushEnabled?: boolean;
      savedSearchAlerts?: boolean;
      favoriteAlerts?: boolean;
    },
  ) {
    return this.notificationsService.updatePreferences(req.user.userId, body);
  }

  /** Get alert preferences */
  @Get('preferences')
  getPreferences(@Request() req: any) {
    return this.notificationsService.getPreferences(req.user.userId);
  }
}
