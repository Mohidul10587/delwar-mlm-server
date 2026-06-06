"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToArray = convertToArray;
// Function to convert a comma-separated string into an array
function convertToArray(text, delimiter = ",") {
    return text.split(delimiter).map((item) => item.trim());
}
