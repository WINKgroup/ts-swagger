import { TsSwgMethod } from "./_types";
import * as t from "@babel/types";
import _ from "lodash";

export const getResStatus = (comment: string) => {
    const status = comment.match(/\{(.*?)\}/);
    if (status) {
        return {
            [status[1]]: {
                description: getCommentValue(`{${status[1]}}`, comment, true) || ""
            }
        }
    }
    return;
};

export const getCommentValue = (label: string, comment: string, spacing?: boolean) => {
    const result = comment.split(label)[1];

    return spacing ? result : result.replace(/\s+/g, "");
};

export const getParameter = (comment: string, parameterType: "path" | "query") => {
    const name = comment.match(/\{(.*?)\}/);
    const type = comment.match(/\[(.*?)\]/);

    if (name && type) {
        return {
            name: name[1],
            type: type[1],
            description: getCommentValue(`[${type[1]}]`, comment, true) || "",
            parameterType
        }
    }
};

export const getMethodInfo = (rows: string[]) => {
    let methodInfo: TsSwgMethod = {
        name: "",
        path: "",
        urlParameters: []
    };

    for (const index in rows) {
        const row = rows[index];
        if (row.includes("@schema"))
            methodInfo = {
                ...methodInfo,
                interfaceName: getCommentValue("@schema ", row)
            };
        else if (row.includes("@request"))
            methodInfo = {
                ...methodInfo,
                name: getCommentValue("@request ", row).toLowerCase()
            };
        else if (row.includes("@route"))
            methodInfo = {
                ...methodInfo,
                path: getCommentValue("@route ", row)
            };
        else if (row.includes("@description"))
            methodInfo = {
                ...methodInfo,
                description: getCommentValue("@description ", row, true)
            };
        else if (row.includes("@response_description"))
            methodInfo = {
                ...methodInfo,
                responseDescription: getCommentValue("@response_description ", row, true)
            };
        else if (row.includes("@error_schema"))
            methodInfo = {
                ...methodInfo,
                errorInterfaceName: getCommentValue("@error_schema ", row)
            };
        else if (row.includes("@status_code"))
            _.merge(methodInfo, { resStates: getResStatus(row) });
        else if (row.includes("@query_parameter")) {
            const queryParameter = getParameter(row, "query");
            queryParameter && methodInfo.urlParameters?.push(queryParameter);
        }
        else if (row.includes("@path_parameter")) {
            const pathParameter = getParameter(row, "path");
            pathParameter && methodInfo.urlParameters?.push(pathParameter);
        }
    }

    return methodInfo;
};

export const checkMethodName = (name?: string) => {
    switch (name) {
        case "get":
        case "put":
        case "post":
        case "delete":
            return true
        default:
            return false
    }
};

export const getVariableType = (type: string) => {
    switch (type) {
        case "TSBooleanKeyword":
            return "boolean"
        case "TSNumberKeyword":
            return "number"
        case "TSArrayType":
            return "array"
        case "TSObjectKeyword":
            return "object"
        default:
            return "string"
    }
};

export const isDate = (body: t.TSTypeElement) => {
    return (
        body.typeAnnotation?.typeAnnotation.type === "TSTypeReference" &&
        "typeName" in body.typeAnnotation?.typeAnnotation &&
        "name" in body.typeAnnotation?.typeAnnotation.typeName &&
        body.typeAnnotation?.typeAnnotation.typeName.name === "Date"
    ) ||
        (
            body.typeAnnotation?.typeAnnotation &&
            "elementType" in body.typeAnnotation?.typeAnnotation &&
            "typeName" in body.typeAnnotation?.typeAnnotation.elementType &&
            "name" in body.typeAnnotation?.typeAnnotation.elementType.typeName &&
            body.typeAnnotation?.typeAnnotation.elementType.typeName.name === "Date"
        )
}
