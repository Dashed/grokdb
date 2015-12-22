
function Response(error, status, response) {

    if(!(this instanceof Response)) {
        return new Response(error, status, response);
    }

    this.error = error;
    this.status = status;
    this.response = response;
}

module.exports = {

    Response: Response,

    // response types
    NOT_FOUND: Symbol('NOT_FOUND'),
    OK: Symbol('OK'),
    INVALID: Symbol('INVALID')

};
