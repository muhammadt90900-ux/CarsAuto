// apps/api/src/common/guards/jwt-auth.guard.ts
//
// ✅ FIX #6 (Medium): This is the SINGLE canonical JwtAuthGuard.
//
// The old codebase had two identical copies:
//   - apps/api/src/common/guards/jwt-auth.guard.ts       ← keep this one
//   - apps/api/src/modules/auth/guards/jwt-auth.guard.ts  ← DELETE this one
//
// All imports across the codebase must point here:
//   import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
//   import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
//
// Keeping two identical files risks:
//   1. One being updated while the other is forgotten
//   2. NestJS DI creating two separate provider instances
//   3. Import path confusion for new developers

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
