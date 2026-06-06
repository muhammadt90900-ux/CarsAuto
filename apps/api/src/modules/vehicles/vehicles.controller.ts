// apps/api/src/modules/vehicles/vehicles.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { BrandQueryDto, ModelQueryDto, TrimQueryDto } from './dto/vehicle-query.dto';

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
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

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
  @Get('brands')
  getBrands(@Query() query: BrandQueryDto) {
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
  @Get('brands/:brandId/models')
  getModelsByBrand(
    @Param('brandId') brandId: string,
    @Query() query: ModelQueryDto,
  ) {
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
  @Get('models/:modelId/years')
  getYearsByModel(@Param('modelId') modelId: string) {
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
  @Get('models/:modelId/trims')
  getTrimsByModelAndYear(
    @Param('modelId') modelId: string,
    @Query() query: TrimQueryDto,
  ) {
    return this.vehiclesService.getTrimsByModelAndYear(modelId, query);
  }
}
