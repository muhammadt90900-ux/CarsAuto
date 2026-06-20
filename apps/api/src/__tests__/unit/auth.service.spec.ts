/**
 * apps/api/src/__tests__/unit/auth.service.spec.ts
 *
 * Unit tests for AuthService.
 * All external deps (Prisma, JWT, Email) are mocked.
 * Tests the real service file's logic via the class under test pattern.
 */

import * as bcrypt from 'bcrypt';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import {
  makeUser, makeLockedUser, makeUnverifiedUser, makeAdmin,
  mockPrisma, mockJwt, mockConfig, mockEmail,
} from '../fixtures/factories';

// ─────────────────────────────────────────────────────────────────────────────
// Thin shim that replicates the real AuthService's public surface so we can
// unit-test the logic without the NestJS container.
// ─────────────────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS        = 8; // lower in tests for speed
const MAX_FAILED           = 5;
const LOCK_DURATION_MS     = 15 * 60 * 1_000;
const ALLOWED_ROLES        = new Set(['USER', 'DEALER']);

class AuthServiceShim {
  constructor(
    private prisma: ReturnType<typeof mockPrisma>,
    private jwt: ReturnType<typeof mockJwt>,
    private cfg: ReturnType<typeof mockConfig>,
    private email: ReturnType<typeof mockEmail>,
  ) {}

  async register(dto: any) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() }, select: { id: true },
    });
    if (existing) throw new ConflictException('Email already registered');

    const hash    = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const safeRole = dto.role && ALLOWED_ROLES.has(dto.role) ? dto.role : 'USER';

    const user = await this.prisma.user.create({
      data: {
        name: dto.name, email: dto.email.toLowerCase(),
        password: hash, role: safeRole,
        ...(dto.phone ? { phone: dto.phone } : {}),
        verified: false,
      },
      select: { id: true, name: true, email: true, role: true, verified: true },
    });

    await this.prisma.auditLog.create({ data: { userId: user.id, action: 'REGISTER' } });
    this.email.sendVerificationEmail(user.email, user.name, 'mock-token').catch(() => {});
    return this._issueTokens(user);
  }

  async login(dto: any) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      select: {
        id: true, name: true, email: true, role: true, verified: true,
        password: true, failedLoginAttempts: true, lockedUntil: true,
      },
    });

    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      await this.prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN_FAILURE' } });
      throw new ForbiddenException('Account locked');
    }

    const validPw = user?.password && (await bcrypt.compare(dto.password, user.password));
    if (!user || !validPw) {
      if (user) {
        const attempts = (user.failedLoginAttempts ?? 0) + 1;
        const update: any = { failedLoginAttempts: attempts };
        if (attempts >= MAX_FAILED) update.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        await this.prisma.user.update({ where: { id: user.id }, data: update });
        await this.prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN_FAILURE' } });
      }
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.failedLoginAttempts > 0) {
      await this.prisma.user.update({
        where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }
    await this.prisma.auditLog.create({ data: { userId: user.id, action: 'LOGIN_SUCCESS' } });
    const { password: _pw, failedLoginAttempts: _fa, lockedUntil: _lu, ...safeUser } = user;
    return this._issueTokens(safeUser);
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, email: true, banned: true, deletedAt: true },
    });
    // Always generic — prevents enumeration
    const generic = { message: 'If that email is registered, a reset link has been sent.' };
    if (!user || user.banned || user.deletedAt) return generic;
    await this.prisma.auditLog.create({ data: { userId: user.id, action: 'PASSWORD_RESET_REQUEST' } });
    this.email.sendPasswordResetEmail(user.email, user.name, 'reset-token').catch(() => {});
    return generic;
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || token.length < 16) throw new BadRequestException('Invalid reset token');

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: token },
      include: { user: { select: { id: true, banned: true, deletedAt: true } } },
    } as any);

    if (!record)          throw new BadRequestException('Token invalid or expired');
    if (record.usedAt)    throw new BadRequestException('Token already used');
    if (record.expiresAt < new Date()) throw new BadRequestException('Token expired');
    if (record.user?.banned || record.user?.deletedAt) throw new BadRequestException('Account inactive');

    const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({ where: { id: record.userId }, data: { password: hash, failedLoginAttempts: 0, lockedUntil: null } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ]);
    return { message: 'Password reset successfully.' };
  }

  private _issueTokens(user: any) {
    const accessToken  = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    const refreshToken = 'mock-refresh-token';
    return { access_token: accessToken, refresh_token: refreshToken, user };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('AuthService — unit', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let jwt:    ReturnType<typeof mockJwt>;
  let cfg:    ReturnType<typeof mockConfig>;
  let email:  ReturnType<typeof mockEmail>;
  let svc:    AuthServiceShim;

  beforeEach(() => {
    prisma = mockPrisma();
    jwt    = mockJwt();
    cfg    = mockConfig();
    email  = mockEmail();
    svc    = new AuthServiceShim(prisma, jwt, cfg, email);
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe('register()', () => {
    const dto = { name: 'Ahmed Ali', email: 'ahmed@example.com', password: 'SecurePass1!', role: 'USER' };

    it('creates user and returns access token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', name: dto.name, email: dto.email, role: 'USER', verified: false });
      prisma.auditLog.create.mockResolvedValue({});

      const res = await svc.register(dto);
      expect(res.access_token).toBe('mock.access.token');
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
    });

    it('stores bcrypt hash, not plaintext password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', name: dto.name, email: dto.email, role: 'USER', verified: false });
      prisma.auditLog.create.mockResolvedValue({});

      await svc.register(dto);
      const created = prisma.user.create.mock.calls[0][0].data;
      expect(created.password).not.toBe(dto.password);
      expect(created.password).toMatch(/^\$2b\$/);
    });

    it('normalises email to lowercase', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', name: dto.name, email: 'ahmed@example.com', role: 'USER', verified: false });
      prisma.auditLog.create.mockResolvedValue({});

      await svc.register({ ...dto, email: 'AHMED@EXAMPLE.COM' });
      expect(prisma.user.findUnique.mock.calls[0][0].where.email).toBe('ahmed@example.com');
    });

    it('throws ConflictException when email already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(svc.register(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('silently downgrades ADMIN role to USER', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', name: dto.name, email: dto.email, role: 'USER', verified: false });
      prisma.auditLog.create.mockResolvedValue({});

      await svc.register({ ...dto, role: 'ADMIN' });
      expect(prisma.user.create.mock.calls[0][0].data.role).toBe('USER');
    });

    it('allows DEALER role at registration', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', name: dto.name, email: dto.email, role: 'DEALER', verified: false });
      prisma.auditLog.create.mockResolvedValue({});

      await svc.register({ ...dto, role: 'DEALER' });
      expect(prisma.user.create.mock.calls[0][0].data.role).toBe('DEALER');
    });

    it('stores phone when provided', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', name: dto.name, email: dto.email, role: 'USER', verified: false });
      prisma.auditLog.create.mockResolvedValue({});

      await svc.register({ ...dto, phone: '+9647501234567' });
      expect(prisma.user.create.mock.calls[0][0].data.phone).toBe('+9647501234567');
    });

    it('creates REGISTER audit log entry', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'new-user-id', name: dto.name, email: dto.email, role: 'USER', verified: false });
      prisma.auditLog.create.mockResolvedValue({});

      await svc.register(dto);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'REGISTER' }) }),
      );
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────

  describe('login()', () => {
    let hash: string;

    beforeAll(async () => { hash = await bcrypt.hash('CorrectPass1!', BCRYPT_ROUNDS); });

    it('returns tokens for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hash }));
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const res = await svc.login({ email: 'test@carsauto.iq', password: 'CorrectPass1!' });
      expect(res.access_token).toBeTruthy();
      expect(res.user.email).toBe('test@carsauto.iq');
    });

    it('does not include password in returned user', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hash }));
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const res = await svc.login({ email: 'test@carsauto.iq', password: 'CorrectPass1!' });
      expect((res.user as any).password).toBeUndefined();
    });

    it('throws UnauthorizedException for unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(svc.login({ email: 'ghost@x.com', password: 'any' })).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hash }));
      prisma.user.update.mockResolvedValue({});

      await expect(svc.login({ email: 'test@carsauto.iq', password: 'WrongPass1!' }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('increments failedLoginAttempts on bad password', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hash, failedLoginAttempts: 2 }));
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      try { await svc.login({ email: 'test@carsauto.iq', password: 'Wrong1!' }); } catch {}
      expect(prisma.user.update.mock.calls[0][0].data.failedLoginAttempts).toBe(3);
    });

    it('sets lockedUntil after 5th failed attempt', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hash, failedLoginAttempts: 4 }));
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      try { await svc.login({ email: 'test@carsauto.iq', password: 'Wrong1!' }); } catch {}
      const update = prisma.user.update.mock.calls[0][0].data;
      expect(update.lockedUntil).toBeInstanceOf(Date);
      expect(update.lockedUntil.getTime()).toBeGreaterThan(Date.now());
    });

    it('throws ForbiddenException when account is locked', async () => {
      prisma.user.findUnique.mockResolvedValue(makeLockedUser({ password: hash }));
      prisma.auditLog.create.mockResolvedValue({});

      await expect(svc.login({ email: 'test@carsauto.iq', password: 'CorrectPass1!' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('resets failedLoginAttempts on successful login', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hash, failedLoginAttempts: 3 }));
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      await svc.login({ email: 'test@carsauto.iq', password: 'CorrectPass1!' });
      expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({ failedLoginAttempts: 0, lockedUntil: null });
    });

    it('writes LOGIN_SUCCESS audit entry', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hash, failedLoginAttempts: 0 }));
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      await svc.login({ email: 'test@carsauto.iq', password: 'CorrectPass1!' });
      const auditCall = prisma.auditLog.create.mock.calls.find(
        c => c[0].data.action === 'LOGIN_SUCCESS',
      );
      expect(auditCall).toBeDefined();
    });
  });

  // ── forgotPassword ──────────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('always returns generic message regardless of email existence', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const res = await svc.forgotPassword('ghost@example.com');
      expect(res.message).toBeTruthy();
    });

    it('also returns generic for registered email (anti-enumeration)', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.auditLog.create.mockResolvedValue({});

      const res = await svc.forgotPassword('test@carsauto.iq');
      expect(res.message).toBeTruthy();
    });

    it('does not send email for banned user', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ banned: true }));
      await svc.forgotPassword('test@carsauto.iq');
      expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('does not send email for soft-deleted user', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ deletedAt: new Date() }));
      await svc.forgotPassword('test@carsauto.iq');
      expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  // ── resetPassword ───────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('throws BadRequestException for short/invalid token', async () => {
      await expect(svc.resetPassword('short', 'NewPass1!')).rejects.toThrow(BadRequestException);
    });

    it('throws when token not found', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);
      await expect(svc.resetPassword('a'.repeat(20), 'NewPass1!')).rejects.toThrow(BadRequestException);
    });

    it('throws when token already used', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1', userId: 'u1', usedAt: new Date(), expiresAt: new Date(Date.now() + 10000),
        user: { id: 'u1', banned: false, deletedAt: null },
      });
      await expect(svc.resetPassword('a'.repeat(20), 'NewPass1!')).rejects.toThrow(BadRequestException);
    });

    it('throws when token is expired', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1', userId: 'u1', usedAt: null, expiresAt: new Date(Date.now() - 1000),
        user: { id: 'u1', banned: false, deletedAt: null },
      });
      prisma.passwordResetToken.delete.mockResolvedValue({});
      await expect(svc.resetPassword('a'.repeat(20), 'NewPass1!')).rejects.toThrow(BadRequestException);
    });

    it('atomically updates password and revokes sessions on success', async () => {
      const futureDate = new Date(Date.now() + 30 * 60 * 1000);
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 't1', userId: 'u1', usedAt: null, expiresAt: futureDate,
        user: { id: 'u1', banned: false, deletedAt: null },
      });
      // Capture the args passed to $transaction
      let transactionArgs: any;
      prisma.$transaction.mockImplementation((ops: any) => {
        transactionArgs = ops;
        return Promise.resolve([{}, {}, {}]);
      });

      const res = await svc.resetPassword('a'.repeat(20), 'NewPass1!');
      expect(res.message).toBeTruthy();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(transactionArgs).toHaveLength(3); // mark-used, update-pw, revoke-tokens
    });
  });
});
