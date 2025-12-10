/**
 * Validation utilities for Financial Management
 */

/**
 * Validate payment amount
 */
export const validatePaymentAmount = (
    amount: number,
    maxAmount: number
): { valid: boolean; error?: string } => {
    if (amount <= 0) {
        return {
            valid: false,
            error: 'Ödeme tutarı 0\'dan büyük olmalıdır'
        };
    }

    if (amount > maxAmount) {
        return {
            valid: false,
            error: `Maksimum ödeme tutarı: ${maxAmount.toFixed(2)} TL`
        };
    }

    return { valid: true };
};

/**
 * Validate payment recipient
 */
export const validatePaymentRecipient = (
    recipient: any
): { valid: boolean; error?: string } => {
    if (!recipient) {
        return {
            valid: false,
            error: 'Ödeme alıcısı seçilmelidir'
        };
    }

    if (!recipient.id || !recipient.name) {
        return {
            valid: false,
            error: 'Geçersiz alıcı bilgisi'
        };
    }

    return { valid: true };
};

/**
 * Validate date range
 */
export const validateDateRange = (
    startDate: string,
    endDate: string
): { valid: boolean; error?: string } => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return {
            valid: false,
            error: 'Geçersiz tarih formatı'
        };
    }

    if (start > end) {
        return {
            valid: false,
            error: 'Başlangıç tarihi bitiş tarihinden önce olmalıdır'
        };
    }

    // Don't allow ranges more than 2 years
    const twoYearsInMs = 2 * 365 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > twoYearsInMs) {
        return {
            valid: false,
            error: 'Maksimum tarih aralığı 2 yıldır'
        };
    }

    return { valid: true };
};

/**
 * Validate commission percentage
 */
export const validateCommissionPercentage = (
    salespersonPct: number,
    partnersPct: number,
    companyPct: number
): { valid: boolean; error?: string } => {
    const total = salespersonPct + partnersPct + companyPct;

    if (total !== 100) {
        return {
            valid: false,
            error: `Komisyon oranları toplamı %100 olmalıdır (Şu an: %${total})`
        };
    }

    if (salespersonPct < 0 || partnersPct < 0 || companyPct < 0) {
        return {
            valid: false,
            error: 'Komisyon oranları negatif olamaz'
        };
    }

    return { valid: true };
};
