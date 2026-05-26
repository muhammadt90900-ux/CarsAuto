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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const admin_service_1 = require("./admin.service");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
let AdminController = class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }
    // ── Dashboard ──────────────────────────────────────────────────────────
    getStats() {
        return this.adminService.getDashboardStats();
    }
    getAnalytics() {
        return this.adminService.getAnalyticsCharts();
    }
    // ── Users ──────────────────────────────────────────────────────────────
    getUsers(page, limit, search) {
        return this.adminService.getAllUsers(Number(page ?? 1), Number(limit ?? 20), search);
    }
    banUser(id, banned) {
        return this.adminService.banUser(id, banned);
    }
    deleteUser(id) {
        return this.adminService.deleteUser(id);
    }
    // ── Listings ───────────────────────────────────────────────────────────
    getListings(page, limit, status, search) {
        return this.adminService.getAllListings(Number(page ?? 1), Number(limit ?? 20), status, search);
    }
    getPending() {
        return this.adminService.getPendingListings();
    }
    approve(id) {
        return this.adminService.approveListing(id);
    }
    reject(id) {
        return this.adminService.rejectListing(id);
    }
    deleteListing(id) {
        return this.adminService.deleteListing(id);
    }
    // ── Featured Listings ──────────────────────────────────────────────────
    getFeatured() {
        return this.adminService.getFeaturedListings();
    }
    setFeatured(id, featured, featuredUntil) {
        return this.adminService.setFeatured(id, featured, featuredUntil ? new Date(featuredUntil) : undefined);
    }
    // ── Reports ────────────────────────────────────────────────────────────
    getReports(page, limit) {
        return this.adminService.getReports(Number(page ?? 1), Number(limit ?? 20));
    }
    resolveReport(id, action) {
        return this.adminService.resolveReport(id, action);
    }
    // ── Categories ─────────────────────────────────────────────────────────
    getCategories() {
        return this.adminService.getCategories();
    }
    createCategory(body) {
        return this.adminService.createCategory(body);
    }
    updateCategory(id, body) {
        return this.adminService.updateCategory(id, body);
    }
    deleteCategory(id) {
        return this.adminService.deleteCategory(id);
    }
    // ── Translations ───────────────────────────────────────────────────────
    getTranslations(locale) {
        return this.adminService.getTranslations(locale);
    }
    upsertTranslation(body) {
        return this.adminService.upsertTranslation(body.locale, body.key, body.value);
    }
    deleteTranslation(id) {
        return this.adminService.deleteTranslation(id);
    }
    // ── Ads ────────────────────────────────────────────────────────────────
    getAds(page, limit) {
        return this.adminService.getAds(Number(page ?? 1), Number(limit ?? 20));
    }
    createAd(body) {
        return this.adminService.createAd({
            ...body,
            startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
            endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
        });
    }
    updateAd(id, body) {
        return this.adminService.updateAd(id, body);
    }
    deleteAd(id) {
        return this.adminService.deleteAd(id);
    }
    // ── System Settings ────────────────────────────────────────────────────
    getSettings() {
        return this.adminService.getSettings();
    }
    upsertSetting(body) {
        return this.adminService.upsertSetting(body.key, body.value);
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('analytics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Patch)('users/:id/ban'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('banned')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "banUser", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)('listings'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getListings", null);
__decorate([
    (0, common_1.Get)('listings/pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getPending", null);
__decorate([
    (0, common_1.Patch)('listings/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "approve", null);
__decorate([
    (0, common_1.Patch)('listings/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "reject", null);
__decorate([
    (0, common_1.Delete)('listings/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteListing", null);
__decorate([
    (0, common_1.Get)('featured'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getFeatured", null);
__decorate([
    (0, common_1.Patch)('listings/:id/featured'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('featured')),
    __param(2, (0, common_1.Body)('featuredUntil')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "setFeatured", null);
__decorate([
    (0, common_1.Get)('reports'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getReports", null);
__decorate([
    (0, common_1.Patch)('reports/:id/resolve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('action')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "resolveReport", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Post)('categories'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Patch)('categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteCategory", null);
__decorate([
    (0, common_1.Get)('translations'),
    __param(0, (0, common_1.Query)('locale')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getTranslations", null);
__decorate([
    (0, common_1.Post)('translations'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "upsertTranslation", null);
__decorate([
    (0, common_1.Delete)('translations/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteTranslation", null);
__decorate([
    (0, common_1.Get)('ads'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getAds", null);
__decorate([
    (0, common_1.Post)('ads'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "createAd", null);
__decorate([
    (0, common_1.Patch)('ads/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "updateAd", null);
__decorate([
    (0, common_1.Delete)('ads/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "deleteAd", null);
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Post)('settings'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminController.prototype, "upsertSetting", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [admin_service_1.AdminService])
], AdminController);
