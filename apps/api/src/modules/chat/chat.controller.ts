import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** List all conversations for the current user */
  @Get()
  getMyChats(@Request() req: any) {
    return this.chatService.getMyChats(req.user.userId);
  }

  /** Total unread message count across all chats */
  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    return this.chatService.getTotalUnreadCount(req.user.userId);
  }

  /** Get or create a chat thread for a specific listing */
  @Post('listing/:listingId')
  getOrCreate(@Param('listingId') listingId: string, @Request() req: any) {
    return this.chatService.getOrCreateChat(listingId, req.user.userId);
  }

  /** Paginated message history for a chat */
  @Get(':chatId/messages')
  getMessages(
    @Param('chatId') chatId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.getChatMessages(chatId, cursor, limit ? parseInt(limit, 10) : 50);
  }

  /** Send a new message */
  @Post(':chatId/messages')
  send(
    @Param('chatId') chatId: string,
    @Request() req: any,
    @Body() body: { content: string; type?: string },
  ) {
    return this.chatService.sendMessage(chatId, req.user.userId, body.content, body.type);
  }

  /** Mark all messages in a chat as read for the current user */
  @Patch(':chatId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@Param('chatId') chatId: string, @Request() req: any) {
    return this.chatService.markChatRead(chatId, req.user.userId);
  }

  /** Soft-delete (archive) a chat for the current user */
  @Delete(':chatId')
  @HttpCode(HttpStatus.NO_CONTENT)
  archiveChat(@Param('chatId') chatId: string, @Request() req: any) {
    return this.chatService.archiveChat(chatId, req.user.userId);
  }
}
