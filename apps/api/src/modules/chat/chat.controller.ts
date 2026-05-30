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
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { IsString, MaxLength, IsOptional, IsIn } from 'class-validator';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

class SendMessageDto {
  @IsString()
  @MaxLength(4000, { message: 'Message content too long (max 4000 chars)' })
  content: string;

  @IsOptional()
  @IsIn(['text', 'image', 'offer'])
  type?: string;
}

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  getMyChats(@Request() req: any) {
    return this.chatService.getMyChats(req.user.userId);
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: any) {
    return this.chatService.getTotalUnreadCount(req.user.userId);
  }

  @Post('listing/:listingId')
  getOrCreate(
    @Param('listingId', ParseUUIDPipe) listingId: string,
    @Request() req: any,
  ) {
    return this.chatService.getOrCreateChat(listingId, req.user.userId);
  }

  // FIX: Membership check added — user must be buyer or seller in this chat
  @Get(':chatId/messages')
  getMessages(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Request() req: any,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Math.min(Math.max(1, Number(limit ?? 50)), 100);
    return this.chatService.getChatMessagesSecure(chatId, req.user.userId, cursor, parsedLimit);
  }

  // FIX: Typed DTO with MaxLength to prevent oversized message payloads
  @Post(':chatId/messages')
  send(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Request() req: any,
    @Body() body: SendMessageDto,
  ) {
    return this.chatService.sendMessageSecure(chatId, req.user.userId, body.content, body.type);
  }

  @Patch(':chatId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Request() req: any,
  ) {
    return this.chatService.markChatRead(chatId, req.user.userId);
  }

  @Delete(':chatId')
  @HttpCode(HttpStatus.NO_CONTENT)
  archiveChat(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Request() req: any,
  ) {
    return this.chatService.archiveChat(chatId, req.user.userId);
  }
}
