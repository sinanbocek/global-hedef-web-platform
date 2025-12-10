/**
 * Formatting utilities for Financial Management
 */

/**
 * Format number as Turkish Lira currency
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

/**
 * Format date in Turkish locale
 */
export const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('tr-TR');
};

/**
 * Format datetime in Turkish locale
 */
export const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleString('tr-TR');
};

/**
 * Format percentage
 */
export const formatPercent = (value: number): string => {
    return `%${value.toFixed(2)}`;
};

/**
 * Shorten UUID for display
 */
export const shortenId = (id: string, length: number = 8): string => {
    return id.substring(0, length);
};
