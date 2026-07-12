// apps/api/src/modules/verification/dto/submit-verification.dto.ts
import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export const DOCUMENT_TYPES = ['NATIONAL_ID', 'PASSPORT', 'DRIVING_LICENSE'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export class SubmitVerificationDto {
  @ApiProperty({
    description: 'Type of ID document submitted',
    enum: DOCUMENT_TYPES,
    example: 'NATIONAL_ID',
  })
  @IsIn(DOCUMENT_TYPES, {
    message:
      'جۆری بەڵگەنامە دروست نییە / Invalid document type. Must be one of: ' +
      DOCUMENT_TYPES.join(', '),
  })
  documentType!: DocumentType;

  // documentFront / documentBack / selfie arrive as multipart files, handled
  // by FileFieldsInterceptor in the controller — not part of this body DTO
  // (matches UploadController's convention: files via @UploadedFile(s),
  // non-file fields via @Body()).
}
