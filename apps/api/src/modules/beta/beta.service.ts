// apps/api/src/modules/beta/beta.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RegisterBetaDto } from './dto/register-beta.dto';
import { UpdateBetaStatusDto } from './dto/update-beta-status.dto';
import { BetaQueryDto } from './dto/beta-query.dto';
import { BetaRegistrationStatus } from '../../common/prisma/enums';
import { generateUniqueReferralCode } from '../../common/utils/referral-code.util';

@Injectable()
export class BetaService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueReferralId(): Promise<string> {
    return generateUniqueReferralCode(async (candidate) => {
      const existing = await this.prisma.betaRegistration.findUnique({
        where: { referralId: candidate },
        select: { id: true },
      });
      return !!existing;
    });
  }

  /**
   * Public registration entry point. Idempotent-friendly: if the same phone
   * number registers again, we don't fail with a confusing conflict — we
   * just create a new lead row (a dealer legitimately re-submitting with
   * corrected details is common pre-launch); admins see all of them and can
   * reconcile manually via search. Referral codes are resolved server-side
   * so the referrer relationship can't be spoofed by hand-editing input.
   */
  async register(dto: RegisterBetaDto) {
    let referredById: string | undefined;

    if (dto.referralCode) {
      const referrer = await this.prisma.betaRegistration.findUnique({
        where: { referralId: dto.referralCode },
        select: { id: true },
      });
      if (referrer) referredById = referrer.id;
    }

    const referralId = await this.uniqueReferralId();

    const registration = await this.prisma.betaRegistration.create({
      data: {
        dealerName: dto.dealerName,
        ownerName: dto.ownerName,
        phone: dto.phone,
        city: dto.city,
        businessType: dto.businessType,
        facebookUrl: dto.facebookUrl,
        website: dto.website,
        notes: dto.notes,
        referralId,
        referredByCode: dto.referralCode,
        referredById,
        locale: dto.locale,
      },
    });

    return registration;
  }

  async findAll(query: BetaQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.businessType) where.businessType = query.businessType;
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { dealerName: { contains: term, mode: 'insensitive' } },
        { ownerName: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { referralId: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.betaRegistration.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: query.sortBy === 'oldest' ? 'asc' : 'desc' },
        include: {
          _count: {
            select: { referrals: { where: { status: 'APPROVED' } } },
          },
        },
      }),
      this.prisma.betaRegistration.count({ where }),
    ]);

    return {
      data: data.map((r) => ({ ...r, verifiedReferralCount: r._count.referrals })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getPendingCount(): Promise<number> {
    return this.prisma.betaRegistration.count({ where: { status: 'PENDING' } });
  }

  async updateStatus(id: string, dto: UpdateBetaStatusDto) {
    const existing = await this.prisma.betaRegistration.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Beta registration not found');

    const becomingApproved =
      dto.status === BetaRegistrationStatus.APPROVED && existing.status !== BetaRegistrationStatus.APPROVED;

    return this.prisma.betaRegistration.update({
      where: { id },
      data: {
        status: dto.status,
        // Once granted, the Founding Dealer badge is permanent — it's never
        // revoked just because an admin later moves the row to a different
        // status (e.g. correcting a mis-click), so we only ever set it,
        // never unset it here.
        ...(becomingApproved ? { isFoundingDealer: true } : {}),
      },
    });
  }
}
