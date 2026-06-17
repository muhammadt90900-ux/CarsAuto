import {
  Controller, Get, Post, Patch, Body, Param, Query,
  Request, UseGuards, HttpCode, HttpStatus, BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post(':listingId')
  getOrCreate(@Param('listingId', ParseUUIDPipe) listingId: string, @Request() req: any) {
    return this.chatService.getOrCreateChat(listingId, req.user.userId);
  }

  @Get()
  getMyChats(@Request() req: any) {
    return this.chatService.getMyChats(req.user.userId);
  }

  // ✅ BUG #5 FIX: Static routes BEFORE parameterized routes
  @Get('unread/count')
  getUnreadCount(@Request() req: any) {
    return this.chatService.getTotalUnreadCount(req.user.userId);
  }

  @Patch(':chatId/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(@Param('chatId', ParseUUIDPipe) chatId: string, @Request() req: any) {
    return this.chatService.archiveChat(chatId, req.user.userId);
  }

  @Get(':chatId/messages')
  getMessages(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: string | undefined,
    @Request() req: any,
  ) {
    return this.chatService.getChatMessagesSecure(
      chatId, req.user.userId, cursor, limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post(':chatId/messages')
  sendMessage(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body() body: { content: string; type?: string },
    @Request() req: any,
  ) {
    return this.chatService.sendMessageSecure(chatId, req.user.userId, body.content, body.type);
  }

  /**
   * POST /chats/:chatId/voice-note
   * REST fallback for clients that cannot use WebSockets.
   * Body: { audioBase64, duration, mimeType }
   */
  @Post(':chatId/voice-note')
  async sendVoiceNote(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body() body: { audioBase64: string; duration: number; mimeType: 'audio/webm' | 'audio/mp4' | 'audio/ogg' },
    @Request() req: any,
  ) {
    if (!body.audioBase64 || !body.mimeType) {
      throw new BadRequestException('audioBase64 and mimeType are required');
    }
    return this.chatService.sendVoiceNote(chatId, req.user.userId, {
      audioBase64: body.audioBase64,
      duration:    body.duration ?? 0,
      mimeType:    body.mimeType,
    });
  }

  @Post(':chatId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@Param('chatId', ParseUUIDPipe) chatId: string, @Request() req: any) {
    return this.chatService.markChatRead(chatId, req.user.userId);
  }
}
