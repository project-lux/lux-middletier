class DisabledError extends Error {
    constructor(message, statusCode = 404) {
        super(message);
        this.name = "DisabledError";
        this.statusCode = statusCode;
    }
}
export default DisabledError;
