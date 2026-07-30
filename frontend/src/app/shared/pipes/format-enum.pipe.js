import { __decorate } from "tslib";
import { Pipe } from '@angular/core';
let FormatEnumPipe = class FormatEnumPipe {
    transform(value) {
        if (!value)
            return '';
        return value
            .replace(/_/g, ' ')
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
};
FormatEnumPipe = __decorate([
    Pipe({
        name: 'formatEnum',
        standalone: true
    })
], FormatEnumPipe);
export { FormatEnumPipe };
