"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterDto = void 0;
// apps/api/src/modules/auth/dto/register.dto.ts
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
/**
 * Password must be 8-128 chars and contain at least:
 *  - one uppercase letter
 *  - one lowercase letter
 *  - one digit
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,128}$/;
const PASSWORD_MSG = 'پاسوۆردەکە دەبێت لانیکەم ٨ پیت بێت و لێکدانەوەی پیتی گەورە، بچووک و ژمارە تێدا بێت / ' +
    'Password must be at least 8 characters and contain uppercase, lowercase, and a number';
const PHONE_REGEX = /^[+\d\s\-()\u0660-\u0669]{7,20}$/;
class RegisterDto {
}
exports.RegisterDto = RegisterDto;
__decorate([
    (0, class_validator_1.IsString)({ message: 'ناو دەبێت دەق بێت / Name must be a string' }),
    (0, class_validator_1.MinLength)(2, { message: 'ناو دەبێت لانیکەم ٢ پیت بێت / Name must be at least 2 characters' }),
    (0, class_validator_1.MaxLength)(80, { message: 'ناو زۆر درێژە / Name is too long' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], RegisterDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsEmail)({}, { message: 'ئیمەیڵی دروست بنووسە / Please enter a valid email address' }),
    (0, class_validator_1.MaxLength)(254, { message: 'ئیمەیڵ زۆر درێژە / Email is too long' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()?.toLowerCase()),
    __metadata("design:type", String)
], RegisterDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, { message: PASSWORD_MSG }),
    (0, class_validator_1.MaxLength)(128, { message: 'پاسوۆرد زۆر درێژە / Password is too long' }),
    (0, class_validator_1.Matches)(PASSWORD_REGEX, { message: PASSWORD_MSG }),
    __metadata("design:type", String)
], RegisterDto.prototype, "password", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(PHONE_REGEX, { message: 'ژمارەی تەلەفۆن دروست نییە / Invalid phone number' }),
    (0, class_validator_1.MaxLength)(20),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim() || undefined),
    __metadata("design:type", String)
], RegisterDto.prototype, "phone", void 0);
