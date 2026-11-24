/**
 * Enterprise Numeric Formatting & Rounding Utilities
 * Provides robust floating-point precision correction, comma grouping,
 * whole-number rounding for operational counts/downtimes, trailing-zero stripping,
 * and safe handling of null, undefined, NaN, and Infinity across FactoryOps.
 */

/**
 * Safe number parsing and validation. Returns fallback (default 0) if invalid/NaN/Infinity.
 */
export function safeNumber(val: number | string | null | undefined, fallback: number = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) && !Number.isNaN(num) ? num : fallback;
}

/**
 * Formats any raw number or numeric string to clean display string.
 * Strips floating-point precision artifacts (e.g. 241.399999999999998 -> 241.4).
 * Supports thousands separators (15000.5 -> 15,000.5).
 * Never returns NaN or Infinity.
 *
 * @param val The value to format
 * @param maxDecimals Maximum allowed decimal places (default 2)
 * @param minDecimals Minimum required decimal places (default 0)
 */
export function formatNumber(
  val: number | string | null | undefined,
  maxDecimals: number = 2,
  minDecimals: number = 0
): string {
  const num = safeNumber(val);

  // Handle tiny numbers close to zero (e.g. 0.0000001)
  if (Math.abs(num) < 1e-9) {
    return '0';
  }

  // Round using scientific notation / EPSILON to avoid floating-point rounding quirks
  const factor = Math.pow(10, maxDecimals);
  const rounded = Math.round((num + Number.EPSILON) * factor) / factor;

  // Split into integer and decimal parts
  const parts = rounded.toString().split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let decimalPart = parts[1] || '';

  if (minDecimals > 0) {
    while (decimalPart.length < minDecimals) {
      decimalPart += '0';
    }
  }

  // Trim trailing zeros beyond minDecimals
  if (minDecimals === 0 && decimalPart.length > 0) {
    decimalPart = decimalPart.replace(/0+$/, '');
  }

  return decimalPart.length > 0 ? `${integerPart}.${decimalPart}` : integerPart;
}

/**
 * Format any value to a clean whole integer with thousands commas.
 * e.g., 15000.5 -> "15,001", 125.0000001 -> "125", null -> "0"
 * Used for unit counts, quantities, defect counts, production counts, work order counts, incidents, etc.
 */
export function formatWholeNumber(val: number | string | null | undefined): string {
  const num = safeNumber(val);
  const rounded = Math.round(num);
  return rounded.toLocaleString('en-US');
}

/**
 * Alias for whole integer formatting
 */
export const formatInteger = formatWholeNumber;
export const formatCount = formatWholeNumber;

/**
 * Formats operational unit counts with optional unit suffix.
 * e.g. formatUnitCount(15234.8, 'units') => "15,235 units"
 */
export function formatUnitCount(
  val: number | string | null | undefined,
  unit: string = 'units'
): string {
  const formatted = formatWholeNumber(val);
  return unit ? `${formatted} ${unit}` : formatted;
}

/**
 * Formats duration values such as downtime or cycle times.
 * If whole number or decimals are not meaningful, shows whole number (e.g. 125 hrs, 241 hrs).
 * If decimals are meaningful (e.g. 241.3999999 -> 241.4 hrs), displays up to 1-2 decimals without trailing zeros.
 */
export function formatDuration(
  val: number | string | null | undefined,
  unit: 'hrs' | 'hr' | 'h' | 'min' | 'mins' | 's' | 'sec' = 'hrs',
  maxDecimals: number = 2
): string {
  const num = safeNumber(val);
  // If difference from nearest integer is negligible, display as whole integer
  const isEssentiallyWhole = Math.abs(num - Math.round(num)) < 0.05;
  const decimals = isEssentiallyWhole ? 0 : maxDecimals;
  const formatted = formatNumber(num, decimals, 0);
  const separator = unit === 'h' ? '' : ' ';
  return `${formatted}${separator}${unit}`;
}

/**
 * Formats downtime in hours or minutes.
 * If given minutes and isAlreadyHours is false, converts to hours.
 */
export function formatDowntime(
  val: number | string | null | undefined,
  isAlreadyHours: boolean = true
): string {
  const num = safeNumber(val);
  const hours = isAlreadyHours ? num : num / 60;
  return formatDuration(hours, 'hrs', 1);
}

/**
 * Formats downtime in minutes as whole integer minutes.
 * e.g. 120 min, 3,450 min
 */
export function formatDowntimeMinutes(
  val: number | string | null | undefined,
  unit: string = 'min'
): string {
  const formatted = formatWholeNumber(val);
  return `${formatted} ${unit}`;
}

/**
 * Formats percentage metrics like OEE, Availability, Performance, Quality.
 * e.g. formatPercent(90.2399999) => "90.24%"
 * Strips unnecessary trailing zeros: 90.00% -> "90%"
 */
export function formatPercent(
  val: number | string | null | undefined,
  maxDecimals: number = 2
): string {
  return `${formatNumber(val, maxDecimals, 0)}%`;
}

/**
 * Formats averages (e.g. MTTR, MTBF, average cycle time, standard deviation)
 * Displays at most 2 decimal places.
 */
export function formatAverage(
  val: number | string | null | undefined,
  maxDecimals: number = 2
): string {
  return formatNumber(val, maxDecimals, 0);
}

/**
 * Formats defect count as whole number.
 */
export function formatDefects(
  val: number | string | null | undefined,
  unitSuffix?: string
): string {
  const formatted = formatWholeNumber(val);
  return unitSuffix ? `${formatted} ${unitSuffix}` : formatted;
}

/**
 * Formats scrap in kg or units with at most 1 decimal place (or whole if integer).
 * e.g. 12.5 kg, 15 kg
 */
export function formatScrap(
  val: number | string | null | undefined,
  unit: string = 'kg'
): string {
  const num = safeNumber(val);
  const isWhole = Math.abs(num - Math.round(num)) < 0.05;
  const formatted = formatNumber(num, isWhole ? 0 : 1, 0);
  return `${formatted} ${unit}`;
}

/**
 * Formats currency with proper comma separators and max 2 decimal places.
 */
export function formatCurrency(
  val: number | string | null | undefined,
  currencySymbol: string = '$'
): string {
  const num = safeNumber(val);
  const isWhole = Math.abs(num - Math.round(num)) < 0.01;
  return `${currencySymbol}${formatNumber(num, isWhole ? 0 : 2, 0)}`;
}

/**
 * Formats large metrics into compact representation with max 2 decimals.
 * e.g. 209.35K, 3.08M, 15M (no trailing .00)
 */
export function formatCompactNumber(
  val: number | string | null | undefined,
  maxDecimals: number = 2
): string {
  const num = safeNumber(val);
  const abs = Math.abs(num);
  if (abs >= 1_000_000) {
    return `${formatNumber(num / 1_000_000, maxDecimals, 0)}M`;
  }
  if (abs >= 1_000) {
    return `${formatNumber(num / 1_000, maxDecimals, 0)}K`;
  }
  return formatWholeNumber(num);
}
