"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiPathError = exports.JSONFileError = exports.JSONPathError = void 0;
var JSONPathError = /** @class */ (function (_super) {
    __extends(JSONPathError, _super);
    function JSONPathError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = "JSONPathError";
        return _this;
    }
    return JSONPathError;
}(Error));
exports.JSONPathError = JSONPathError;
var JSONFileError = /** @class */ (function (_super) {
    __extends(JSONFileError, _super);
    function JSONFileError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = "JSONFileError";
        return _this;
    }
    return JSONFileError;
}(Error));
exports.JSONFileError = JSONFileError;
var ApiPathError = /** @class */ (function (_super) {
    __extends(ApiPathError, _super);
    function ApiPathError(message) {
        var _this = _super.call(this, message) || this;
        _this.name = "ApiPathError";
        return _this;
    }
    return ApiPathError;
}(Error));
exports.ApiPathError = ApiPathError;
