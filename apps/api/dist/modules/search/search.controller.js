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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
// apps/api/src/modules/search/search.controller.ts
const common_1 = require("@nestjs/common");
const search_service_1 = require("./search.service");
let SearchController = class SearchController {
    constructor(searchService) {
        this.searchService = searchService;
    }
    /**
     * GET /search
     *
     * Query params (all optional, compose together):
     *   q            – free-text keyword (searches all localised title/desc fields)
     *   type         – listing type  : CAR | MOTORCYCLE | SPARE_PART
     *   brandId      – vehicle brand UUID
     *   modelId      – vehicle model UUID  (brand must match)
     *   trimId       – specific trim UUID  (model must match)
     *   year         – exact production year
     *   minYear      – year range lower bound
     *   maxYear      – year range upper bound
     *   condition    – NEW | USED | SALVAGE
     *   minPrice     – price lower bound  (USD)
     *   maxPrice     – price upper bound  (USD)
     *   locationId   – location UUID
     *   fuelType     – PETROL | DIESEL | HYBRID | PLUG_IN_HYBRID | ELECTRIC | LPG | CNG
     *   transmission – MANUAL | AUTOMATIC | SEMI_AUTOMATIC | CVT | DUAL_CLUTCH
     *   color        – free-text color string (case-insensitive)
     *   minMileage   – mileage lower bound (km)
     *   maxMileage   – mileage upper bound (km)
     *   page         – 1-based page number (default 1)
     *   limit        – results per page    (default 20, max 100)
     */
    search(q, type, brandId, modelId, trimId, year, minYear, maxYear, condition, minPrice, maxPrice, locationId, fuelType, transmission, color, minMileage, maxMileage, page, limit) {
        const parsedLimit = Math.min(Number(limit ?? 20), 100);
        return this.searchService.search(q ?? '', {
            type,
            brandId,
            modelId,
            trimId,
            year,
            minYear,
            maxYear,
            condition,
            minPrice,
            maxPrice,
            locationId,
            fuelType,
            transmission,
            color,
            minMileage,
            maxMileage,
            page: Number(page ?? 1),
            limit: parsedLimit,
        });
    }
    /**
     * GET /search/autocomplete?q=toy
     * Returns up to 6 title suggestions for the search input dropdown.
     */
    autocomplete(q) {
        return this.searchService.autocomplete(q);
    }
};
exports.SearchController = SearchController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('brandId')),
    __param(3, (0, common_1.Query)('modelId')),
    __param(4, (0, common_1.Query)('trimId')),
    __param(5, (0, common_1.Query)('year')),
    __param(6, (0, common_1.Query)('minYear')),
    __param(7, (0, common_1.Query)('maxYear')),
    __param(8, (0, common_1.Query)('condition')),
    __param(9, (0, common_1.Query)('minPrice')),
    __param(10, (0, common_1.Query)('maxPrice')),
    __param(11, (0, common_1.Query)('locationId')),
    __param(12, (0, common_1.Query)('fuelType')),
    __param(13, (0, common_1.Query)('transmission')),
    __param(14, (0, common_1.Query)('color')),
    __param(15, (0, common_1.Query)('minMileage')),
    __param(16, (0, common_1.Query)('maxMileage')),
    __param(17, (0, common_1.Query)('page')),
    __param(18, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('autocomplete'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SearchController.prototype, "autocomplete", null);
exports.SearchController = SearchController = __decorate([
    (0, common_1.Controller)('search'),
    __metadata("design:paramtypes", [search_service_1.SearchService])
], SearchController);
