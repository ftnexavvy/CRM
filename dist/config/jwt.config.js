"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtConfig = void 0;
const jwtConfig = () => ({
    jwt: {
        accessTokenExpiresIn: "15m",
        refreshTokenExpiresIn: "7d",
    },
});
exports.jwtConfig = jwtConfig;
//# sourceMappingURL=jwt.config.js.map