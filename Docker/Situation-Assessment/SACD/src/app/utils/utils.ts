
/**
 * Converts a CVSS score to a severity class.
 * @param value CVSS score as a string or number, or null.
 * @param type CVSS type (2 for CVSS 2.0, 3 for CVSS 3.*)
 * @returns 'low', 'medium', 'high', 'critical', or 'unknown'
 */
export function scoreToClassCVSS(value: string | number | null, type: number) {
    console.log('Calculating score class for value:', value, 'type:', type);
    if (value === null || value === undefined) {
        return 'unknown';
    }

    if (typeof value == 'string') {
      value = ~~value; // Convert string to number
    }

    if (type === 2) {
      if (value <= 3.9) {
        return 'low';
      }

      if (value > 3.9 && value <= 6.9) {
        return 'medium';
      }

      if (value > 6.9) {
        return 'high';
      }
    } else if (type === 3) {
      if (value > 8.9) {
        return 'critical';
      }

      if (value > 6.9) {
        return 'high';
      }

      if (value > 3.9 && value <= 6.9) {
        return 'medium';
      }

      if (value <= 3.9) {
        return 'low';
      }
    }
    return 'unknown';
}