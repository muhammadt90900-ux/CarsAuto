"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListingStatus = exports.Currency = exports.ListingCondition = exports.ListingType = void 0;
// packages/types/src/listing.ts
var ListingType;
(function (ListingType) {
    ListingType["CAR"] = "CAR";
    ListingType["MOTORCYCLE"] = "MOTORCYCLE";
    ListingType["SPARE_PART"] = "SPARE_PART";
})(ListingType || (exports.ListingType = ListingType = {}));
var ListingCondition;
(function (ListingCondition) {
    ListingCondition["NEW"] = "NEW";
    ListingCondition["USED"] = "USED";
    ListingCondition["SALVAGE"] = "SALVAGE";
})(ListingCondition || (exports.ListingCondition = ListingCondition = {}));
var Currency;
(function (Currency) {
    Currency["IQD"] = "IQD";
    Currency["USD"] = "USD";
    Currency["AED"] = "AED";
    Currency["CNY"] = "CNY";
    Currency["EUR"] = "EUR";
})(Currency || (exports.Currency = Currency = {}));
var ListingStatus;
(function (ListingStatus) {
    ListingStatus["ACTIVE"] = "ACTIVE";
    ListingStatus["SOLD"] = "SOLD";
    ListingStatus["DRAFT"] = "DRAFT";
    ListingStatus["EXPIRED"] = "EXPIRED";
    ListingStatus["PENDING"] = "PENDING";
    ListingStatus["REJECTED"] = "REJECTED";
})(ListingStatus || (exports.ListingStatus = ListingStatus = {}));
