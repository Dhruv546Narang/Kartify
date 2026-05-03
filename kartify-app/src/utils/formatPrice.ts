/**
 * Price formatting utility for Indian Rupee
 */

export const formatPrice = (price: number): string => {
  return `₹${price.toFixed(2)}`;
};

export const formatPriceShort = (price: number): string => {
  if (price >= 1000) {
    return `₹${(price / 1000).toFixed(1)}k`;
  }
  return `₹${Math.round(price)}`;
};
