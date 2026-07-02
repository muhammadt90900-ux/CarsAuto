// packages/types/src/common.ts

/** Shape of the NestJS default error response body (and our custom filters). */
export interface ApiError {
  statusCode: number;
  message: string | string[];
  error: string;
}
