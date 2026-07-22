// apps/api/src/modules/beta/dto/update-beta-status.dto.ts
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BetaRegistrationStatus } from '../../../common/prisma/enums';

export class UpdateBetaStatusDto {
  @ApiProperty({ enum: BetaRegistrationStatus, example: 'APPROVED' })
  @IsEnum(BetaRegistrationStatus, { message: 'Invalid status' })
  status!: BetaRegistrationStatus;
}
