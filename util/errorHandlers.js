/**
 * Helper func to get all the old values of the req body fields
 * @param fields    The fields to retrieve
 * @param req   The req object
 * @returns Object of {fieldName: fieldValue}
 */
exports.getOldValuesByFields = (fields, req) => {
    const oldValues = {};
    fields.forEach(item => {
        oldValues[item] = req.body[item];
    });
    return oldValues;
};

/**
 * Get all the fields that got error in the validation process
 * @param errors    The errors object of the express-validation
 * @returns Object of {errorFieldName: True}
 */
exports.getErrorFields = (errors) => {
    const errorFields = {};
    errors.array().forEach(item => errorFields[item.param] = true);
    return errorFields;
};