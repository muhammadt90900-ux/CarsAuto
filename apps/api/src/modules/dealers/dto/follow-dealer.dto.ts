// apps/api/src/modules/dealers/dto/follow-dealer.dto.ts
// No body needed for follow/unfollow — dealerId comes from URL param.
// Kept as placeholder for future options (e.g. notify preferences).

import { IsOptional, IsBoolean } from 'class-validator';

export class FollowDealerDto {
  /**
   * When true, the follower receives push/email notifications
   * for new listings from this dealer. Defaults to true.
   */
  @IsOptional()
  @IsBoolean()
  notify?: boolean = true;
}
