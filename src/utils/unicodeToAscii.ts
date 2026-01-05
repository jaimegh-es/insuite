// Reverse mapping for Unicode Variants

const offsets: Record<string, [number, number]> = {
    m: [0x1d670, 0x1d7f6],
    b: [0x1d400, 0x1d7ce],
    i: [0x1d434, 0x00030],
    bi: [0x1d468, 0x00030],
    c: [0x0001d49c, 0x00030],
    bc: [0x1d4d0, 0x00030],
    g: [0x1d504, 0x00030],
    d: [0x1d538, 0x1d7d8],
    bg: [0x1d56c, 0x00030],
    s: [0x1d5a0, 0x1d7e2],
    bs: [0x1d5d4, 0x1d7ec],
    is: [0x1d608, 0x00030],
    bis: [0x1d63c, 0x00030],
    o: [0x24B6, 0x2460],
    on: [0x0001f150, 0x2460],
    p: [0x249c, 0x2474],
    q: [0x1f130, 0x00030],
    qn: [0x0001F170, 0x00030],
    w: [0xff21, 0xff10],
    u: [0x2090, 0xff10]
};

// Special characters map (Reverse needed)
// We need to map FROM the special char TO the ascii char.
// toUnicodeVariant has: special[type][char] = codePoint
// We need: reverseSpecial[codePoint] = char
const reverseSpecial: Map<number, string> = new Map();

const special: Record<string, Record<string, number>> = {
    m: { ' ': 0x2000, '-': 0x2013 },
    i: { 'h': 0x210e },
    g: { 'C': 0x212d, 'H': 0x210c, 'I': 0x2111, 'R': 0x211c, 'Z': 0x2128 },
    d: { 'C': 0x2102, 'H': 0x210D, 'N': 0x2115, 'P': 0x2119, 'Q': 0x211A, 'R': 0x211D, 'Z': 0x2124 },
    o: { '0': 0x24EA, '1': 0x2460, '2': 0x2461, '3': 0x2462, '4': 0x2463, '5': 0x2464, '6': 0x2465, '7': 0x2466, '8': 0x2467, '9': 0x2468 },
    on: {}, p: {}, q: {}, qn: {}, w: {}
};

// Initialize reverseSpecial
Object.entries(special).forEach(([type, map]) => {
    Object.entries(map).forEach(([char, code]) => {
        reverseSpecial.set(code, char);
    });
});

// Also handle the generated specials in toUnicodeVariant initialization
// ['p', 'w', 'on', 'q', 'qn'].forEach...
// We replicate that logic to populate reverseSpecial
['p', 'w', 'on', 'q', 'qn'].forEach(t => {
    for (var i = 97; i <= 122; i++) {
        const char = String.fromCharCode(i);
        const code = offsets[t][0] + (i-97);
        reverseSpecial.set(code, char);
    }
});


export function unicodeToAscii(str: string): string {
    let result = '';
    for (const char of str) {
        const code = char.codePointAt(0);
        if (!code) {
            result += char;
            continue;
        }

        // 1. Check special map first
        if (reverseSpecial.has(code)) {
            result += reverseSpecial.get(code);
            continue;
        }

        // 2. Check ranges
        let found = false;
        
        // We need to check against all offsets. 
        // offsets[type] = [alphaStart, numberStart]
        // ASCII A-Z is 65-90. a-z is 97-122. 0-9 is 48-57.
        
        // We iterate through all variant types to see if this char belongs to one.
        for (const [type, [alphaStart, numberStart]] of Object.entries(offsets)) {
            // Check Capital Letters
            // If char is between alphaStart and alphaStart + 25
            if (code >= alphaStart && code <= alphaStart + 25) {
                result += String.fromCharCode(65 + (code - alphaStart));
                found = true;
                break;
            }
            // Check Small Letters
            // Small letters are usually alphaStart + 26 + 6 (gap between Z and a in ASCII? No.)
            // In Unicode Math blocks, usually A-Z and a-z are contiguous or separated.
            // toUnicodeVariant logic:
            // if (index = chars.indexOf(c)) ... result += String.fromCodePoint(index + offsets[type][0])
            // chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
            // index 0-25: Caps. index 26-51: Small.
            
            // So code point for 'a' (index 26) is alphaStart + 26.
            if (code >= alphaStart + 26 && code <= alphaStart + 51) {
                result += String.fromCharCode(97 + (code - (alphaStart + 26)));
                found = true;
                break;
            }
            
            // Check Numbers
            // numbers = "0123456789"
            // index 0-9.
            // code point for '0' is numberStart + 0.
            if (numberStart !== 0x00030) { // 0x00030 indicates no number mapping or default
                 if (code >= numberStart && code <= numberStart + 9) {
                    result += String.fromCharCode(48 + (code - numberStart));
                    found = true;
                    break;
                 }
            }
        }

        if (!found) {
            // Handle combining marks (underline, strike)
            // \u0332 (underline), \u0336 (strike)
            if (code === 0x0332 || code === 0x0336) {
                // Skip them to "remove" formatting
                continue;
            }
            result += char;
        }
    }
    return result;
}
