import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // FIX: Public profile — never exposes email or phone to unauthenticated callers
  async findByIdPublic(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatar: true,
        role: true,
        verified: true,
        createdAt: true,
        // email and phone intentionally excluded from public profile
        listings: {
          where: { status: 'ACTIVE', deletedAt: null },
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            titleKu: true,
            titleEn: true,
            price: true,
            currency: true,
            createdAt: true,
            images: { where: { isCover: true }, take: 1, select: { url: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(
    id: string,
    data: { name?: string; phone?: string; locale?: string; avatar?: string },
  ) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
        locale: true,
      },
    });
  }
}
