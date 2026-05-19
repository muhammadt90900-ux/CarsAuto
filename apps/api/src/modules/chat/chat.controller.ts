import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  getMyChats(@Request() req: any) {
    return this.chatService.getMyChats(req.user.userId);
  }

  @Post('listing/:listingId')
  getOrCreate(@Param('listingId') listingId: string, @Request() req: any) {
    return this.chatService.getOrCreateChat(listingId, req.user.userId);
  }

  @Get(':chatId/messages')
  getMessages(@Param('chatId') chatId: string) {
    return this.chatService.getChatMessages(chatId);
  }

  @Post(':chatId/messages')
  send(
    @Param('chatId') chatId: string,
    @Request() req: any,
    @Body() body: { content: string; type?: string },
  ) {
    return this.chatService.sendMessage(chatId, req.user.userId, body.content, body.type);
  }
}
