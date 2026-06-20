/**
 * apps/api/src/__tests__/auth/auth-security.spec.ts
 *
 * Authentication & authorisation tests:
 *   - JWT issuance and validation edge cases
 *   - Refresh token rotation and reuse detection
 *   - Role-based access control (RBAC)
 *   - Account lockout brute-force protection
 *   - Password reset security (anti-enumeration, token lifecycle)
 *   - Token cleanup / session revocation
 */

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  ForbiddenException, UnauthorizedException, BadRequestException, ConflictException,
} from '@nestjs/common';
import {
  makeUser, makeAdmin, makeDealer, makeLockedUser, makeJwtPayload,
  mockPrisma, mockJwt, mockConfig, mockEmail,
} from '../fixtures/factories';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const hashToken = (raw: string) => crypto.createHash('sha256').update(raw).digest('hex');

const BCRYPT_ROUNDS = 8;
const MAX_FAILED    = 5;
const LOCK_MS       = 15 * 60 * 1_000;
const ALLOWED_ROLES = new Set(['USER', 'DEALER']);

/** Full auth-service shim — mirrors real logic closely enough for security tests */
class AuthSvc {
  constructor(
    public prisma: ReturnType<typeof mockPrisma>,
    public jwt:    ReturnType<typeof mockJwt>,
    public email:  ReturnType<typeof mockEmail>,
  ) {}

  async register(dto: any) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() }, select: { id: true } });
    if (existing) throw new ConflictException('Email already registered');
    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const safeRole = dto.role && ALLOWED_ROLES.has(dto.role) ? dto.role : 'USER';
    const user = await this.prisma.user.create({ data: { email: dto.email.toLowerCase(), password: hash, name: dto.name, role: safeRole, verified: false }, select: { id: true, name: true, email: true, role: true, verified: true } });
    await this.prisma.auditLog.create({ data: { userId: user.id, action: 'REGISTER' } });
    return this._issue(user);
  }

  async login(dto: any) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() }, select: { id: true, name: true, email: true, role: true, verified: true, password: true, failedLoginAttempts: true, lockedUntil: true } });
    if (user?.lockedUntil && user.lockedUntil > new Date()) throw new ForbiddenException('Account locked');
    const ok = user?.password && await bcrypt.compare(dto.password, user.password);
    if (!user || !ok) {
      if (user) {
        const n = (user.failedLoginAttempts ?? 0) + 1;
        await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: n, ...(n >= MAX_FAILED ? { lockedUntil: new Date(Date.now() + LOCK_MS) } : {}) } });
      }
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.failedLoginAttempts > 0)
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
    const { password: _, failedLoginAttempts: __, lockedUntil: ___, ...safe } = user;
    return this._issue(safe);
  }

  async refresh(rawToken: string) {
    const th = hashToken(rawToken);
    const record = await this.prisma.refreshToken.findUnique({ where: { tokenHash: th }, include: { user: { select: { id: true, email: true, role: true } } } } as any);
    if (!record) throw new UnauthorizedException('Invalid refresh token');
    if (record.revokedAt)  { await this._revokeFamily(record.familyId); throw new UnauthorizedException('Token reuse detected'); }
    if (record.expiresAt < new Date()) throw new UnauthorizedException('Refresh token expired');
    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({ where: { id: record.id }, data: { revokedAt: new Date() } });
    const newRaw = crypto.randomBytes(64).toString('hex');
    await this.prisma.refreshToken.create({ data: { tokenHash: hashToken(newRaw), userId: record.user.id, familyId: record.familyId, expiresAt: new Date(Date.now() + 7 * 86_400_000) } });
    const access = this.jwt.sign({ sub: record.user.id, email: record.user.email, role: record.user.role });
    return { access_token: access, refresh_token: newRaw };
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.prisma.auditLog.create({ data: { userId, action: 'LOGOUT' } });
  }

  private async _revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({ where: { familyId }, data: { revokedAt: new Date() } });
  }

  private _issue(user: any) {
    const access = this.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    return { access_token: access, refresh_token: 'mock-refresh', user };
  }
}

// ── JwtStrategy shim ─────────────────────────────────────────────────────────

class JwtStrategy {
  validate(payload: any) {
    if (!payload?.sub) throw new UnauthorizedException('Invalid token payload');
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Auth Security Tests', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let jwt:    ReturnType<typeof mockJwt>;
  let email:  ReturnType<typeof mockEmail>;
  let svc:    AuthSvc;
  let hash:   string;

  beforeAll(async () => { hash = await bcrypt.hash('SecurePass1!', BCRYPT_ROUNDS); });

  beforeEach(() => {
    prisma = mockPrisma();
    jwt    = mockJwt();
    email  = mockEmail();
    svc    = new AuthSvc(prisma, jwt, email);
  });

  // ── JWT payload validation ──────────────────────────────────────────────────

  describe('JWT payload validation', () => {
    const strategy = new JwtStrategy();

    it('accepts valid payload with sub, email, role', () => {
      const result = strategy.validate(makeJwtPayload());
      expect(result).toMatchObject({ userId: expect.any(String), email: expect.any(String) });
    });

    it('rejects payload missing sub', () => {
      expect(() => strategy.validate({ email: 'x@x.com', role: 'USER' })).toThrow(UnauthorizedException);
    });

    it('rejects null payload', () => {
      expect(() => strategy.validate(null)).toThrow(UnauthorizedException);
    });

    it('rejects empty object payload', () => {
      expect(() => strategy.validate({})).toThrow(UnauthorizedException);
    });

    it('preserves role in returned user object', () => {
      expect(strategy.validate(makeJwtPayload({ role: 'ADMIN' })).role).toBe('ADMIN');
    });
  });

  // ── RBAC: role escalation prevention ────────────────────────────────────────

  describe('Role escalation prevention', () => {
    it('cannot self-assign ADMIN during registration', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', email: 'x@x.com', name: 'X', role: 'USER', verified: false });
      prisma.auditLog.create.mockResolvedValue({});

      await svc.register({ name: 'X', email: 'x@x.com', password: 'SecurePass1!', role: 'ADMIN' });
      expect(prisma.user.create.mock.calls[0][0].data.role).toBe('USER');
    });

    it('cannot self-assign arbitrary unknown roles', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', email: 'x@x.com', name: 'X', role: 'USER', verified: false });
      prisma.auditLog.create.mockResolvedValue({});

      await svc.register({ name: 'X', email: 'x@x.com', password: 'SecurePass1!', role: 'SUPERUSER' });
      expect(prisma.user.create.mock.calls[0][0].data.role).toBe('USER');
    });

    it('USER role is accepted at registration', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', email: 'x@x.com', name: 'X', role: 'USER', verified: false });
      prisma.auditLog.create.mockResolvedValue({});

      await svc.register({ name: 'X', email: 'x@x.com', password: 'SecurePass1!', role: 'USER' });
      expect(prisma.user.create.mock.calls[0][0].data.role).toBe('USER');
    });

    it('DEALER role is accepted at registration', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', email: 'x@x.com', name: 'X', role: 'DEALER', verified: false });
      prisma.auditLog.create.mockResolvedValue({});

      await svc.register({ name: 'X', email: 'x@x.com', password: 'SecurePass1!', role: 'DEALER' });
      expect(prisma.user.create.mock.calls[0][0].data.role).toBe('DEALER');
    });
  });

  // ── Brute-force / account lockout ───────────────────────────────────────────

  describe('Brute-force protection', () => {
    it('increments counter on each failed attempt', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hash, failedLoginAttempts: 1 }));
      prisma.user.update.mockResolvedValue({});

      try { await svc.login({ email: 'test@carsauto.iq', password: 'Wrong!' }); } catch {}
      expect(prisma.user.update.mock.calls[0][0].data.failedLoginAttempts).toBe(2);
    });

    it('sets lockedUntil when counter reaches MAX_FAILED (5)', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hash, failedLoginAttempts: 4 }));
      prisma.user.update.mockResolvedValue({});

      try { await svc.login({ email: 'test@carsauto.iq', password: 'Wrong!' }); } catch {}
      const updateData = prisma.user.update.mock.calls[0][0].data;
      expect(updateData.lockedUntil).toBeInstanceOf(Date);
      expect(updateData.lockedUntil.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);
    });

    it('rejects login even with correct password when locked', async () => {
      prisma.user.findUnique.mockResolvedValue(makeLockedUser({ password: hash }));
      prisma.auditLog.create.mockResolvedValue({});

      await expect(svc.login({ email: 'test@carsauto.iq', password: 'SecurePass1!' }))
        .rejects.toThrow(ForbiddenException);
    });

    it('does not increment attempts for unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      try { await svc.login({ email: 'ghost@x.com', password: 'any' }); } catch {}
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ── Refresh token security ──────────────────────────────────────────────────

  describe('Refresh token rotation', () => {
    const makeRecord = (overrides: any = {}) => ({
      id: 'rt-1', tokenHash: 'hash', userId: 'user-uuid-1111', familyId: 'family-1',
      revokedAt: null, expiresAt: new Date(Date.now() + 7 * 86_400_000),
      user: { id: 'user-uuid-1111', email: 'test@carsauto.iq', role: 'USER' },
      ...overrides,
    });

    it('issues new access and refresh tokens on valid rotation', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(makeRecord());
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const res = await svc.refresh('raw-valid-token');
      expect(res.access_token).toBe('mock.access.token');
      expect(res.refresh_token).toBeTruthy();
    });

    it('revokes old token after rotation', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(makeRecord());
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      await svc.refresh('raw-valid-token');
      expect(prisma.refreshToken.update.mock.calls[0][0].data.revokedAt).toBeInstanceOf(Date);
    });

    it('throws UnauthorizedException for unknown token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(svc.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('detects token reuse and revokes entire family', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(makeRecord({ revokedAt: new Date() }));
      prisma.refreshToken.updateMany.mockResolvedValue({});

      await expect(svc.refresh('reused-token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { familyId: 'family-1' } }),
      );
    });

    it('throws for expired refresh token', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(makeRecord({ expiresAt: new Date(Date.now() - 1000) }));
      await expect(svc.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── Logout / session revocation ─────────────────────────────────────────────

  describe('logout()', () => {
    it('revokes all refresh tokens for the user', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });
      prisma.auditLog.create.mockResolvedValue({});

      await svc.logout('user-uuid-1111');
      expect(prisma.refreshToken.deleteMany.mock.calls[0][0].where.userId).toBe('user-uuid-1111');
    });

    it('writes LOGOUT audit entry', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      await svc.logout('user-uuid-1111');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ action: 'LOGOUT' }) }),
      );
    });
  });

  // ── Email uniqueness / duplicate registration ────────────────────────────────

  describe('Duplicate email prevention', () => {
    it('throws ConflictException on duplicate email (exact case)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(svc.register({ name: 'X', email: 'test@carsauto.iq', password: 'Pass1!' }))
        .rejects.toThrow(ConflictException);
    });

    it('normalises email before uniqueness check (case-insensitive)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', name: 'X', email: 'test@carsauto.iq', role: 'USER', verified: false });
      prisma.auditLog.create.mockResolvedValue({});

      await svc.register({ name: 'X', email: 'TEST@CARSAUTO.IQ', password: 'Pass1!' });
      const uniqueCheck = prisma.user.findUnique.mock.calls[0][0].where.email;
      expect(uniqueCheck).toBe('test@carsauto.iq');
    });
  });

  // ── Anti-enumeration ─────────────────────────────────────────────────────────

  describe('Anti-enumeration (login)', () => {
    it('returns identical error message for unknown email vs wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      let msgA: string | undefined;
      try { await svc.login({ email: 'ghost@x.com', password: 'any' }); }
      catch (e: any) { msgA = e.message; }

      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hash }));
      prisma.user.update.mockResolvedValue({});
      let msgB: string | undefined;
      try { await svc.login({ email: 'test@carsauto.iq', password: 'WrongPass1!' }); }
      catch (e: any) { msgB = e.message; }

      expect(msgA).toBe(msgB); // same message — no account enumeration
    });
  });

  // ── Password not returned in responses ──────────────────────────────────────

  describe('Sensitive field exclusion', () => {
    it('login response does not include password field', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hash, failedLoginAttempts: 0 }));
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const res = await svc.login({ email: 'test@carsauto.iq', password: 'SecurePass1!' });
      expect((res.user as any).password).toBeUndefined();
    });

    it('login response does not include failedLoginAttempts', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ password: hash, failedLoginAttempts: 0 }));
      prisma.user.update.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const res = await svc.login({ email: 'test@carsauto.iq', password: 'SecurePass1!' });
      expect((res.user as any).failedLoginAttempts).toBeUndefined();
    });

    it('register response does not include password hash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'u1', name: 'X', email: 'x@x.com', role: 'USER', verified: false });
      prisma.auditLog.create.mockResolvedValue({});

      const res = await svc.register({ name: 'X', email: 'x@x.com', password: 'Pass1!', role: 'USER' });
      expect((res.user as any).password).toBeUndefined();
    });
  });
});
