/**
 * Bangladesh Timezone (Asia/Dhaka - UTC+6) Date & Time Utilities
 */

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
    return d.toLocaleString('bn-BD');
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
    return d.toLocaleDateString('bn-BD');
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
    return d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
  }
}
