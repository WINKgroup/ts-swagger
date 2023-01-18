"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TsSwagger = void 0;
var lodash_1 = __importDefault(require("lodash"));
var fs = __importStar(require("fs"));
var parser = __importStar(require("@babel/parser"));
var traverse_1 = __importDefault(require("@babel/traverse"));
var _errors_1 = require("./_errors");
var TsSwagger = /** @class */ (function () {
    function TsSwagger(path) {
        this.createApiJson = function (methods) {
            var json = {};
            methods.forEach(function (method) {
                var _a, _b;
                var name = method.name, path = method.path, interfaceName = method.interfaceName, description = method.description, responseDescription = method.responseDescription, resStates = method.resStates;
                var id = path.includes(":") &&
                    path.substring(path.indexOf(':') + 1);
                var methodPath = id
                    ? path.replace(":".concat(id), "{".concat(id, "}"))
                    : path;
                var newJson = (_a = {},
                    _a[methodPath] = (_b = {},
                        _b[name] = __assign(__assign(__assign({ tags: [interfaceName], description: "".concat(description ? description : "") }, (id
                            ? {
                                parameters: [
                                    {
                                        name: "".concat(id),
                                        in: "path",
                                        schema: {
                                            type: "string",
                                        },
                                        required: true,
                                        description: "The ".concat(interfaceName, " id"),
                                    },
                                ],
                            }
                            : {})), name === 'post' || name === 'put' ? {
                            requestBody: {
                                required: true,
                                content: {
                                    "application/json": {
                                        schema: {
                                            $ref: "#/components/schemas/".concat(interfaceName)
                                        }
                                    }
                                }
                            }
                        } : {}), { responses: __assign(__assign({}, resStates ? resStates : {}), { 200: {
                                    description: "".concat(responseDescription ? responseDescription : ""),
                                    content: {
                                        "application/json": __assign({}, name === 'get' && !path.includes(':') ? {
                                            schema: {
                                                type: "".concat(name === "get" ? "array" : "object"),
                                                items: {
                                                    $ref: "#/components/schemas/".concat(interfaceName),
                                                },
                                            }
                                        } : {
                                            schema: {
                                                $ref: "#/components/schemas/".concat(interfaceName)
                                            }
                                        }),
                                    },
                                } }) }),
                        _b),
                    _a);
                lodash_1.default.merge(json, newJson);
            });
            return json;
        };
        try {
            this.tsSwgConfig = JSON.parse(fs.readFileSync(path).toString());
        }
        catch (_a) {
            throw new _errors_1.JSONPathError("Invalid JSON Path");
        }
    }
    TsSwagger.prototype.getAst = function (pathList) {
        var fileContents = [];
        pathList.forEach(function (path) {
            var data = fs.readFileSync(path).toString();
            fileContents.push(data);
        });
        return parser.parse(fileContents.join(""), {
            sourceType: "module",
            plugins: ["typescript"],
        });
    };
    TsSwagger.prototype.searchInterestingNodes = function (ast) {
        var nodes = [];
        (0, traverse_1.default)(ast, {
            enter: function (path) {
                var _a;
                if (path.node.type === "TSInterfaceDeclaration" &&
                    ((_a = path.node.body.body[0].leadingComments) === null || _a === void 0 ? void 0 : _a.some(function (comment) {
                        return comment.value.replace(/\s+/g, "").toLowerCase() === "swagger";
                    }))) {
                    nodes.push(path.node);
                }
            },
        });
        return nodes;
    };
    TsSwagger.prototype.scanExpressApi = function (ast) {
        var methods = [];
        var getCommentValue = function (label, comment, spacing) {
            if (comment
                .replace(/\s+/g, "")
                .toLowerCase()
                .startsWith(label)) {
                var value = spacing
                    ? comment
                    : comment.replace(/\s+/g, "");
                return value.replace(label, "");
            }
        };
        var getResStatus = function (comment) {
            var _a;
            var status = comment.match(/\{(.*?)\}/);
            if (status) {
                return _a = {},
                    _a[status[1]] = {
                        description: getCommentValue("{".concat(status[1], "}:"), comment, true) || ''
                    },
                    _a;
            }
            return;
        };
        var getMethodInfo = function (comment) {
            var schema = getCommentValue("schema:", comment);
            var description = getCommentValue("description:", comment, true);
            var responseDescription = getCommentValue("response_description:", comment, true);
            var status = getResStatus(comment);
            return __assign(__assign(__assign(__assign({}, schema ? { interfaceName: schema } : {}), description ? { description: description } : {}), responseDescription ? { responseDescription: responseDescription } : {}), status ? { resStates: status } : {});
        };
        (0, traverse_1.default)(ast, {
            enter: function (path) {
                var _a, _b, _c, _d, _e, _f, _g;
                if (path.node.type === "ExpressionStatement" &&
                    (path.node.expression.callee.property.name === "get" ||
                        path.node.expression.callee.property.name === "post" ||
                        path.node.expression.callee.property.name === "delete" ||
                        path.node.expression.callee.property.name === "put")) {
                    var method_1 = {
                        name: path.node.expression.callee.property.name,
                        path: path.node.expression.arguments[0].value,
                    };
                    (_d = (_c = (_b = (_a = path.node.expression.arguments[1]) === null || _a === void 0 ? void 0 : _a.body) === null || _b === void 0 ? void 0 : _b.body[0]) === null || _c === void 0 ? void 0 : _c.leadingComments) === null || _d === void 0 ? void 0 : _d.forEach(function (comment) {
                        lodash_1.default.merge(method_1, getMethodInfo(comment.value));
                    });
                    (_g = (_f = (_e = path.node.expression.arguments[1]) === null || _e === void 0 ? void 0 : _e.body) === null || _f === void 0 ? void 0 : _f.innerComments) === null || _g === void 0 ? void 0 : _g.forEach(function (comment) {
                        lodash_1.default.merge(method_1, getMethodInfo(comment.value));
                    });
                    if (method_1.interfaceName)
                        methods.push(method_1);
                }
            },
        });
        return methods;
    };
    TsSwagger.prototype.getDataForSchemas = function (nodes) {
        var schemasData = [];
        var getVariableType = function (type) {
            switch (type) {
                case "TSBooleanKeyword":
                    return "boolean";
                case "TSNumberKeyword":
                    return "number";
                case "TSArrayType":
                    return "array";
                case "TSObjectKeyword":
                    return "object";
                case "TSStringKeyword":
                default:
                    return "string";
            }
        };
        nodes.forEach(function (node) {
            var variables = [];
            node.body.body.forEach(function (body) {
                var _a, _b, _c, _d;
                if ("key" in body) {
                    if ("name" in body.key) {
                        var type = getVariableType((_a = body.typeAnnotation) === null || _a === void 0 ? void 0 : _a.typeAnnotation.type);
                        var arrayType = undefined;
                        if (type === 'array') {
                            if (((_b = body.typeAnnotation) === null || _b === void 0 ? void 0 : _b.typeAnnotation) && "elementType" in ((_c = body.typeAnnotation) === null || _c === void 0 ? void 0 : _c.typeAnnotation))
                                arrayType = getVariableType((_d = body.typeAnnotation) === null || _d === void 0 ? void 0 : _d.typeAnnotation.elementType.type);
                        }
                        variables.push({
                            name: body.key.name,
                            optional: body.optional || false,
                            type: arrayType ? arrayType : type,
                            array: !!arrayType
                        });
                    }
                }
            });
            schemasData.push({
                interfaceName: node.id.name,
                variables: variables
            });
        });
        return schemasData;
    };
    TsSwagger.prototype.generateBasicJson = function (schemasData, apiName, version, description) {
        var _a;
        var json = {
            openapi: "3.0.0",
            info: (_a = {
                    title: apiName,
                    version: version,
                    description: description
                },
                _a["x-comment"] = "Generated by Ts-Swagger (https://github.com/WINKgroup/ts-to-openapi)",
                _a),
            paths: {},
            servers: []
        };
        schemasData.forEach(function (model) {
            var _a;
            var _b;
            var required = [];
            var interfaceName = model.interfaceName;
            var properties = {};
            (_b = model.variables) === null || _b === void 0 ? void 0 : _b.forEach(function (variable) {
                var _a, _b;
                variable.optional === false && variable.name && required.push(variable.name);
                if (variable.array) {
                    properties = __assign(__assign({}, properties), variable.name ? (_a = {},
                        _a[variable.name] = {
                            items: {
                                title: "".concat(interfaceName, ".").concat(variable.name, ".[]"),
                                type: variable.type
                            },
                            title: "".concat(interfaceName, ".").concat(variable.name),
                            type: "array"
                        },
                        _a) : {});
                }
                else {
                    properties = __assign(__assign({}, properties), variable.name ? (_b = {},
                        _b[variable.name] = {
                            title: "".concat(interfaceName, ".").concat(variable.name),
                            type: variable.type
                        },
                        _b) : {});
                }
            });
            var newJson = {
                components: {
                    schemas: (_a = {},
                        _a[interfaceName] = {
                            properties: properties,
                            required: required,
                            additionalProperties: false,
                            title: interfaceName,
                            type: "object",
                        },
                        _a)
                }
            };
            lodash_1.default.merge(json, newJson);
        });
        return json;
    };
    TsSwagger.prototype.checkConfig = function (tsSwgConfig) {
        var correctKeys = ['pathList', 'apiName', 'version'];
        for (var key in correctKeys) {
            if (!tsSwgConfig.hasOwnProperty(correctKeys[key]))
                throw new _errors_1.JSONFileError("Invalid JSON file");
        }
        for (var path in tsSwgConfig.pathList) {
            if (!fs.existsSync(tsSwgConfig.pathList[path]))
                throw new _errors_1.ApiPathError("Invalid API Path");
        }
    };
    TsSwagger.prototype.getSwagger = function (fileName) {
        this.checkConfig(this.tsSwgConfig);
        var _a = this.tsSwgConfig, pathList = _a.pathList, apiName = _a.apiName, version = _a.version, description = _a.description, servers = _a.servers;
        var ast = this.getAst(pathList);
        var nodes = this.searchInterestingNodes(ast);
        var methods = this.scanExpressApi(ast);
        var schemasData = this.getDataForSchemas(nodes);
        var swagger = this.generateBasicJson(schemasData, apiName, version, description);
        swagger.servers = servers;
        swagger.paths = this.createApiJson(methods);
        var json = JSON.stringify(swagger, null, 2);
        if (fileName) {
            this.createJson(json, fileName);
        }
        return json;
    };
    TsSwagger.prototype.createJson = function (json, fileName) {
        fs.writeFile(fileName, json, function (err) {
            if (err)
                console.error(err.message);
        });
    };
    return TsSwagger;
}());
exports.TsSwagger = TsSwagger;
