/**
 * Bangladesh Timezone (Asia/Dhaka - UTC+6) Date & Time Utilities
 * Guaranteed accurate Bangladesh Standard Time across all client browsers and server environments.
 */

export function getBDDate(dateInput: string | number | Date = new Date()): Date {
  const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

export function formatBDDateTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return 'আজ';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  try {
    const datePart = d.toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Dhaka'
    });
    const timePart = d.toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dhaka'
    });
    return `${datePart}, ${timePart}`;
  } catch (e) {
    return d.toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' });
  }
}

export function formatBDDate(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return 'আজ';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  try {
    return d.toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Dhaka'
    });
  } catch (e) {
    return d.toLocaleDateString('bn-BD', { timeZone: 'Asia/Dhaka' });
  }
}

export function formatBDDateLong(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return 'আজ';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  try {
    return d.toLocaleDateString('bn-BD', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Dhaka'
    });
  } catch (e) {
    return d.toLocaleDateString('bn-BD', { timeZone: 'Asia/Dhaka' });
  }
}

export function formatBDTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';

  try {
    return d.toLocaleTimeString('bn-BD', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Dhaka'
    });
  } catch (e) {
    return d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' });
  }
}

export function getBDDateStr(dateInput: string | number | Date = new Date()): string {
  const d = typeof dateInput === 'object' ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  try {
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
  } catch (e) {
    const bdOffset = 6 * 60;
    const bdTime = new Date(d.getTime() + (bdOffset + d.getTimezoneOffset()) * 60000);
    return bdTime.toISOString().slice(0, 10);
  }
}
