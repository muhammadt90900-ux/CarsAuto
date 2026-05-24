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
exports.VehiclesController = void 0;
// apps/api/src/modules/vehicles/vehicles.controller.ts
const common_1 = require("@nestjs/common");
const vehicles_service_1 = require("./vehicles.service");
const vehicle_query_dto_1 = require("./dto/vehicle-query.dto");
/**
 * VehiclesController
 *
 * Provides read-only, dynamic APIs for the automotive brand/model/trim
 * selection system.  All endpoints are public (no auth guard) so the
 * frontend can call them freely during listing creation or search.
 *
 * Route structure:
 *   GET /vehicles/brands                          → all brands (searchable)
 *   GET /vehicles/brands/:brandId/models          → models for a brand (searchable)
 *   GET /vehicles/models/:modelId/years           → available years for a model
 *   GET /vehicles/models/:modelId/trims           → trims for a model (year-filtered, searchable)
 */
let VehiclesController = class VehiclesController {
    constructor(vehiclesService) {
        this.vehiclesService = vehiclesService;
    }
    // ─── Brands ───────────────────────────────────────────────────────────────
    /**
     * GET /vehicles/brands
     * Query params:
     *   q  (optional) – full-text search across nameEn / nameAr / nameKu
     *
     * Example:
     *   /vehicles/brands
     *   /vehicles/brands?q=toyo
     */
    getBrands(query) {
        return this.vehiclesService.getBrands(query);
    }
    // ─── Models ───────────────────────────────────────────────────────────────
    /**
     * GET /vehicles/brands/:brandId/models
     * URL param:
     *   brandId – the selected brand's ID
     * Query params:
     *   q  (optional) – full-text search
     *
     * Called every time the user changes the brand in the UI so the models
     * list refreshes dynamically.
     *
     * Example:
     *   /vehicles/brands/clx123/models
     *   /vehicles/brands/clx123/models?q=cam
     */
    getModelsByBrand(brandId, query) {
        return this.vehiclesService.getModelsByBrand(brandId, query);
    }
    // ─── Years ────────────────────────────────────────────────────────────────
    /**
     * GET /vehicles/models/:modelId/years
     * URL param:
     *   modelId – the selected model's ID
     *
     * Returns the distinct years that have active listings for this model.
     * Called when the model changes so the year selector can populate.
     *
     * Example:
     *   /vehicles/models/clm456/years
     */
    getYearsByModel(modelId) {
        return this.vehiclesService.getYearsByModel(modelId);
    }
    // ─── Trims ────────────────────────────────────────────────────────────────
    /**
     * GET /vehicles/models/:modelId/trims
     * URL param:
     *   modelId – the selected model's ID
     * Query params:
     *   year (optional) – filter trims whose yearStart–yearEnd spans this year
     *   q    (optional) – full-text search across nameEn / nameAr / nameKu
     *
     * Called every time the user changes the year in the UI so the trims
     * list refreshes dynamically.
     *
     * Example:
     *   /vehicles/models/clm456/trims?year=2022
     *   /vehicles/models/clm456/trims?year=2022&q=sport
     */
    getTrimsByModelAndYear(modelId, query) {
        return this.vehiclesService.getTrimsByModelAndYear(modelId, query);
    }
};
exports.VehiclesController = VehiclesController;
__decorate([
    (0, common_1.Get)('brands'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [vehicle_query_dto_1.BrandQueryDto]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "getBrands", null);
__decorate([
    (0, common_1.Get)('brands/:brandId/models'),
    __param(0, (0, common_1.Param)('brandId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, vehicle_query_dto_1.ModelQueryDto]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "getModelsByBrand", null);
__decorate([
    (0, common_1.Get)('models/:modelId/years'),
    __param(0, (0, common_1.Param)('modelId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "getYearsByModel", null);
__decorate([
    (0, common_1.Get)('models/:modelId/trims'),
    __param(0, (0, common_1.Param)('modelId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, vehicle_query_dto_1.TrimQueryDto]),
    __metadata("design:returntype", void 0)
], VehiclesController.prototype, "getTrimsByModelAndYear", null);
exports.VehiclesController = VehiclesController = __decorate([
    (0, common_1.Controller)('vehicles'),
    __metadata("design:paramtypes", [vehicles_service_1.VehiclesService])
], VehiclesController);
