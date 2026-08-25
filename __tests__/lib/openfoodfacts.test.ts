/**
 * Tests for the Open Food Facts API client.
 *
 * We mock `fetch` so tests don't hit the network. The mock returns canned
 * responses that mirror the shape of the real OFF API so we can validate
 * the parsing logic in `lookupBarcode`.
 */

import { lookupBarcode } from '@/lib/openfoodfacts';

describe('lookupBarcode', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('returns invalid for malformed barcodes', async () => {
    const result = await lookupBarcode('abc');
    expect(result.found).toBe(false);
    expect(result.error).toMatch(/invalid/i);
  });

  it('parses a successful OFF response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
          product_name: 'Optimum Nutrition Whey',
          brands: 'Optimum Nutrition',
          image_front_url: 'https://example.com/whey.jpg',
          nutriments: {
            'energy-kcal_100g': 120,
            proteins_100g: 24,
            carbohydrates_100g: 3,
            fat_100g: 1.5,
          },
          serving_quantity: 30,
          serving_size: '1 scoop (30g)',
          nutriscore_grade: 'a',
        },
      }),
    }) as any;

    const result = await lookupBarcode('5060367720015');
    expect(result.found).toBe(true);
    expect(result.product?.name).toBe('Optimum Nutrition Whey');
    expect(result.product?.brand).toBe('Optimum Nutrition');
    expect(result.product?.caloriesPer100g).toBe(120);
    expect(result.product?.proteinPer100g).toBe(24);
    expect(result.product?.nutriscore).toBe('a');
    expect(result.product?.servingSize).toBe(30);
  });

  it('handles not-found response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 0, product: null }),
    }) as any;

    const result = await lookupBarcode('0000000000000');
    expect(result.found).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it('handles HTTP errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as any;

    const result = await lookupBarcode('1234567890123');
    expect(result.found).toBe(false);
    expect(result.error).toMatch(/HTTP 500/);
  });

  it('handles network failures', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network down')) as any;

    const result = await lookupBarcode('1234567890123');
    expect(result.found).toBe(false);
    expect(result.error).toBe('Network down');
  });

  it('falls back to image_url when image_front_url is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 1,
        product: {
          product_name: 'Test Product',
          image_url: 'https://example.com/img.jpg',
          nutriments: {},
        },
      }),
    }) as any;

    const result = await lookupBarcode('1234567890123');
    expect(result.product?.imageUrl).toBe('https://example.com/img.jpg');
  });
});
