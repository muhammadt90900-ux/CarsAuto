"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
let AiService = class AiService {
    // بۆ ئەوەی کاردەکات پێویستە OPENAI_API_KEY لە .env بنووسیت
    async suggestPrice(make, model, year, mileage) {
        // ئەمە placeholder ە — دواتر OpenAI API زیاد بکە
        const basePrice = 15000;
        const agePenalty = (new Date().getFullYear() - year) * 500;
        const mileagePenalty = mileage * 0.01;
        return Math.max(basePrice - agePenalty - mileagePenalty, 1000);
    }
    async detectSpam(text) {
        const spamWords = ['scam', 'free money', 'click here', 'guaranteed'];
        return spamWords.some(w => text.toLowerCase().includes(w));
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)()
], AiService);
