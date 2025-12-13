import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toTitleCase(str: string) {
    return str
        .toLocaleLowerCase('tr-TR')
        .split(' ')
        .map(word => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1))
        .join(' ');
}

export function formatPhoneNumber(val: string) {
    // 0 (XXX) XXX XX XX format
    const dig = val.replace(/\D/g, '');
    if (!dig) return '';

    // Format: 0 (5XX) XXX XX XX
    const match = dig.match(/^(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
    if (match) {
        let res = '';
        if (match[1]) res += match[1]; // Leading 0
        if (match[2]) res += ` (${match[2]}`;
        if (match[3]) res += `) ${match[3]}`;
        if (match[4]) res += ` ${match[4]}`;
        if (match[5]) res += ` ${match[5]}`;
        return res.trim();
    }
    return val;
}

export function formatNumberInput(val: string) {
    // Remove non-digits
    const digits = val.replace(/\D/g, '');
    // Format as 1.000.000
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
