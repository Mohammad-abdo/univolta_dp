export function parseDurationToMilliseconds(input) {
    const match = input.trim().match(/^(\d+)([smhd])$/i);
    if (!match) {
        throw new Error(`Invalid duration format: ${input}`);
    }
    const value = Number(match[1]);
    const unit = match[2].toLowerCase();
    switch (unit) {
        case "s":
            return value * 1000;
        case "m":
            return value * 60 * 1000;
        case "h":
            return value * 60 * 60 * 1000;
        case "d":
            return value * 24 * 60 * 60 * 1000;
        default:
            throw new Error(`Unsupported duration unit: ${unit}`);
    }
}
//# sourceMappingURL=time.js.map