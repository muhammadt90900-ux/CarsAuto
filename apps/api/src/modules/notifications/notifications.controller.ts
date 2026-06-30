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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ---------------------------------------------------------------------------
  // Public endpoints (no auth required)
  // ---------------------------------------------------------------------------

  /**
   * Returns the VAPID public key for the browser to use when subscribing.
   * This is intentionally public — the public key is not a secret.
   */
  @Get('push/vapid-key')
  getVapidKey() {
    return { publicKey: this.notificationsService.getVapidPublicKey() };
  }

  // ---------------------------------------------------------------------------
  // Authenticated endpoints
  // ---------------------------------------------------------------------------

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get()
  getAll(@Request() req: any) {
    return this.notificationsService.getMyNotifications(req.user.userId);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get('unread-count')
  unreadCount(@Request() req: any) {
    return this.notificationsService.getUnreadCount(req.user.userId);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.userId);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markOneRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.markOneRead(id, req.user.userId);
  }

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteOne(@Param('id') id: string, @Request() req: any) {
    return this.notificationsService.deleteOne(id, req.user.userId);
  }

  // ---------------------------------------------------------------------------
  // Push subscription (Web Push / PWA)
  // ---------------------------------------------------------------------------

  /** Register a browser push subscription for the current user */
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Post('push/subscribe')
  subscribePush(@Request() req: any, @Body() body: { subscription: object }) {
    return this.notificationsService.savePushSubscription(req.user.userId, body.subscription);
  }

  /** Unregister a browser push subscription */
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Delete('push/subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsubscribePush(@Request() req: any, @Body() body: { endpoint: string }) {
    return this.notificationsService.removePushSubscription(req.user.userId, body.endpoint);
  }

  // ---------------------------------------------------------------------------
  // Preferences
  // ---------------------------------------------------------------------------

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
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

  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  getPreferences(@Request() req: any) {
    return this.notificationsService.getPreferences(req.user.userId);
  }
}
