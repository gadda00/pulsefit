/**
 * Open Food Facts API client.
 *
 * The Open Food Facts database (https://world.openfoodfacts.org/) is a free,
 * open database of food products. We use it to resolve barcodes scanned by
 * the Camera tab into product + nutrition data so the user can review the
 * macros of supplements and snacks before logging them.
 *
 * The endpoint is unauthenticated and rate-limited to ~10 req/min per IP,
 * which is plenty for a single mobile user. We always include a descriptive
 * User-Agent header per the OFF usage policy.
 */

import type { ScannedProduct } from '@/types';
import { isValidBarcode } from './utils';

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const USER_AGENT = 'PulseFit/1.0 (mobile fitness tracker; +https://github.com/pulsefit/pulsefit)';

/** Parsed response from the Open Food Facts API. */
export interface OpenFoodFactsResult {
  found: boolean;
  product?: Omit<ScannedProduct, 'id' | 'scannedAt' | 'notes'>;
  error?: string;
}

/**
 * Look up a barcode in the Open Food Facts database.
 * Returns `{ found: false }` if the product is not in the database.
 *
 * Network failures are caught and returned as `{ found: false, error }`
 * so the caller (camera screen) can show a friendly message instead of
 * throwing an uncaught promise rejection.
 */
export async function lookupBarcode(barcode: string): Promise<OpenFoodFactsResult> {
  if (!isValidBarcode(barcode)) {
    return { found: false, error: 'Invalid barcode format' };
  }

  try {
    const url = `${OFF_BASE}/${barcode}.json?fields=product_name,brands,image_url,image_front_url,image_front_small_url,nutriments,serving_size,serving_quantity,nutriscore_grade`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return { found: false, error: `HTTP ${response.status}` };
    }

    const json: any = await response.json();
    if (json.status !== 1 || !json.product) {
      return { found: false, error: 'Product not found in Open Food Facts' };
    }

    const p = json.product;
    const n = p.nutriments ?? {};
    const imageUrl = p.image_front_url || p.image_front_small_url || p.image_url || null;

    return {
      found: true,
      product: {
        barcode,
        name: p.product_name || `Product ${barcode}`,
        brand: p.brands || null,
        imageUrl,
        caloriesPer100g: n['energy-kcal_100g'] != null ? Math.round(n['energy-kcal_100g']) : null,
        proteinPer100g: n.proteins_100g != null ? Math.round(n.proteins_100g * 10) / 10 : null,
        carbsPer100g: n.carbohydrates_100g != null ? Math.round(n.carbohydrates_100g * 10) / 10 : null,
        fatPer100g: n.fat_100g != null ? Math.round(n.fat_100g * 10) / 10 : null,
        servingSize: p.serving_quantity != null ? Number(p.serving_quantity) : null,
        servingUnit: p.serving_size || null,
        nutriscore: p.nutriscore_grade || null,
      },
    };
  } catch (err: any) {
    return { found: false, error: err?.message ?? 'Network error' };
  }
}
