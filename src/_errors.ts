export class JSONPathError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "JSONPathError";
    }
}

export class JSONFileError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "JSONFileError";
    }
}

export class ApiPathError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ApiPathError";
    }
}