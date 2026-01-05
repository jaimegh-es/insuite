import { toUnicodeVariant } from './toUnicodeVariant';

interface DeltaOp {
  insert?: string | object;
  attributes?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strike?: boolean;
    script?: boolean;
    code?: boolean; // Monospace
    gothic?: boolean;
    doublestruck?: boolean;
    [key: string]: any;
  };
}

interface Delta {
  ops: DeltaOp[];
}

export function deltaToUnicode(delta: Delta): string {
  let result = '';

  for (const op of delta.ops) {
    if (typeof op.insert === 'string') {
      let text = op.insert;
      
      // Handle attributes
      if (op.attributes) {
        let variant = '';
        const flags: string[] = [];

        // Determine base variant
        if (op.attributes.code) {
             variant = 'monospace';
        } else if (op.attributes.script) {
             if (op.attributes.bold) variant = 'bold script';
             else variant = 'script';
        } else if (op.attributes.gothic) {
             if (op.attributes.bold) variant = 'gothic bold';
             else variant = 'gothic';
        } else if (op.attributes.doublestruck) {
             variant = 'doublestruck';
        } else {
             // Default Sans-Serif style (standard for LinkedIn tools)
             if (op.attributes.bold && op.attributes.italic) {
                 variant = 'bold italic sans';
             } else if (op.attributes.bold) {
                 variant = 'bold sans';
             } else if (op.attributes.italic) {
                 variant = 'italic sans';
             }
        }

        // Handle decorations (can be combined with variants)
        if (op.attributes.underline) {
            flags.push('underline');
        }
        if (op.attributes.strike) {
            flags.push('strike');
        }

        // Apply variant if one was selected
        if (variant) {
            text = toUnicodeVariant(text, variant, flags.join(','));
        } else if (flags.length > 0) {
            // Apply flags to normal text
             let flaggedText = '';
             for (const char of text) {
                 flaggedText += char;
                 if (op.attributes.underline) flaggedText += '\u0332';
                 if (op.attributes.strike) flaggedText += '\u0336';
             }
             text = flaggedText;
        }
      }
      
      result += text;
    }
  }

  return result;
}