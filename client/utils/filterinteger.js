
// based on: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt#A_stricter_parse_function
const filterInteger = function (value, defaultValue) {
    if(/^(\-|\+)?([0-9]+|Infinity)$/.test(value)) {
        value = Number(value);
        return (value > 0) ? value : defaultValue;
    }
    return defaultValue;
};

module.exports = filterInteger;
