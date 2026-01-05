import { toUnicodeVariant } from './toUnicodeVariant';

export function markdownToUnicode(markdown: string): string {
    let result = markdown;

    // Handle lists (simple implementation)
    // Replace '- ' or '* ' at start of line with '• '
    result = result.replace(/^[\*\-]\s+(.+)$/gm, '• $1');

    // Handle Bold: **text** or __text__
    result = result.replace(/(\*\*|__)(.*?)\1/g, (_, __, content) => {
        return toUnicodeVariant(content, 'bold sans');
    });

    // Handle Italic: *text* or _text_
    result = result.replace(/(\*|_)(.*?)\1/g, (_, __, content) => {
        return toUnicodeVariant(content, 'italic sans');
    });

    return result;
}
