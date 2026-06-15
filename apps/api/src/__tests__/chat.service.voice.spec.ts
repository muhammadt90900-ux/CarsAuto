import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatService } from '../chat.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockMessage = {
  id:            'msg-uuid-1',
  chatId:        'chat-uuid-1',
  senderId:      'user-uuid-1',
  content:       '',
  type:          'voice',
  messageType:   'voice',
  audioUrl:      'https://res.cloudinary.com/test/voice-notes/voice_user_1.webm',
  audioDuration: 15,
  createdAt:     new Date(),
  sender:        { id: 'user-uuid-1', name: 'Test User', avatar: null },
  readReceipts:  [{ userId: 'user-uuid-1', readAt: new Date() }],
};

const mockChat = {
  id:       'chat-uuid-1',
  buyerId:  'user-uuid-1',
  sellerId: 'user-uuid-2',
};

// ── Minimal Prisma mock ───────────────────────────────────────────────────────
const prismaMock = {
  chat: {
    findUnique: jest.fn().mockResolvedValue(mockChat),
    update:     jest.fn().mockResolvedValue(mockChat),
  },
  message: {
    create: jest.fn().mockResolvedValue(mockMessage),
  },
};

// ── Replace Cloudinary upload so tests don't hit network ──────────────────────
jest.mock('node-fetch', () => jest.fn());

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate a base64 string of approximately `kb` kilobytes */
function base64OfKb(kb: number): string {
  const bytes = Buffer.alloc(kb * 1024, 'a');
  return bytes.toString('base64');
}

// ─────────────────────────────────────────────────────────────────────────────

describe('ChatService.sendVoiceNote', () => {
  let service: ChatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);

    // Patch private Cloudinary method to return a fake URL
    jest
      .spyOn(service as any, 'uploadAudioToCloudinary')
      .mockResolvedValue('https://res.cloudinary.com/test/voice-notes/voice_user_1.webm');

    jest.clearAllMocks();
    prismaMock.chat.findUnique.mockResolvedValue(mockChat);
    prismaMock.message.create.mockResolvedValue(mockMessage);
    prismaMock.chat.update.mockResolvedValue(mockChat);
  });

  // ── Membership check ───────────────────────────────────────────────────────

  it('throws NotFoundException when chat does not exist', async () => {
    prismaMock.chat.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.sendVoiceNote('chat-uuid-1', 'user-uuid-1', {
        audioBase64: base64OfKb(10),
        duration: 5,
        mimeType: 'audio/webm',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when user is not a participant', async () => {
    prismaMock.chat.findUnique.mockResolvedValueOnce({ ...mockChat, buyerId: 'other', sellerId: 'other2' });

    await expect(
      service.sendVoiceNote('chat-uuid-1', 'user-uuid-1', {
        audioBase64: base64OfKb(10),
        duration: 5,
        mimeType: 'audio/webm',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── Size validation ────────────────────────────────────────────────────────

  it('throws BadRequestException when audio exceeds 2 MB', async () => {
    // ~2.1 MB of base64
    const big = base64OfKb(2150);
    await expect(
      service.sendVoiceNote('chat-uuid-1', 'user-uuid-1', {
        audioBase64: big,
        duration: 5,
        mimeType: 'audio/webm',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Duration validation ────────────────────────────────────────────────────

  it('throws BadRequestException when duration is 0', async () => {
    await expect(
      service.sendVoiceNote('chat-uuid-1', 'user-uuid-1', {
        audioBase64: base64OfKb(10),
        duration: 0,
        mimeType: 'audio/webm',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when duration exceeds 120 seconds', async () => {
    await expect(
      service.sendVoiceNote('chat-uuid-1', 'user-uuid-1', {
        audioBase64: base64OfKb(10),
        duration: 121,
        mimeType: 'audio/webm',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── MIME type validation ───────────────────────────────────────────────────

  it('throws BadRequestException for unsupported MIME type', async () => {
    await expect(
      service.sendVoiceNote('chat-uuid-1', 'user-uuid-1', {
        audioBase64: base64OfKb(10),
        duration: 5,
        mimeType: 'audio/wav' as any,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('creates a voice message record on success', async () => {
    const result = await service.sendVoiceNote('chat-uuid-1', 'user-uuid-1', {
      audioBase64: base64OfKb(100),
      duration: 15,
      mimeType: 'audio/webm',
    });

    expect(prismaMock.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          chatId:        'chat-uuid-1',
          senderId:      'user-uuid-1',
          messageType:   'voice',
          audioDuration: 15,
          audioUrl:      'https://res.cloudinary.com/test/voice-notes/voice_user_1.webm',
        }),
      }),
    );

    expect(result).toMatchObject({
      messageType:   'voice',
      audioDuration: 15,
      audioUrl:      expect.stringContaining('cloudinary'),
    });
  });

  it('updates chat updatedAt after sending', async () => {
    await service.sendVoiceNote('chat-uuid-1', 'user-uuid-1', {
      audioBase64: base64OfKb(100),
      duration: 15,
      mimeType: 'audio/webm',
    });

    expect(prismaMock.chat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'chat-uuid-1' },
        data:  expect.objectContaining({ updatedAt: expect.any(Date) }),
      }),
    );
  });

  it('accepts audio/mp4 and audio/ogg MIME types', async () => {
    for (const mimeType of ['audio/mp4', 'audio/ogg'] as const) {
      await expect(
        service.sendVoiceNote('chat-uuid-1', 'user-uuid-1', {
          audioBase64: base64OfKb(10),
          duration: 5,
          mimeType,
        }),
      ).resolves.toBeDefined();
    }
  });
});
