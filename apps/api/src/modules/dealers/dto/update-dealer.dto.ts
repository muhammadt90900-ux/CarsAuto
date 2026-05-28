// apps/api/src/modules/dealers/dto/update-dealer.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateDealerDto } from './create-dealer.dto';
export class UpdateDealerDto extends PartialType(CreateDealerDto) {}
