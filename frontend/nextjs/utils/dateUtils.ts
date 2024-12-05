import { Timestamp } from 'firebase/firestore';
import { DateString } from '@/types';

type TimestampOrString = Timestamp | string;

/**
 * @purpose: Convert Firebase Timestamp to ISO string
 * @performance: O(1) conversion
 */
export const timestampToString = (timestamp: Timestamp | null): DateString => {
  if (!timestamp) return '';
  return timestamp.toDate().toISOString();
};

/**
 * @purpose: Convert ISO string to Firebase Timestamp
 * @performance: O(1) conversion
 */
export const stringToTimestamp = (dateString: DateString): Timestamp => {
  return Timestamp.fromDate(new Date(dateString));
};

/**
 * @purpose: Safely handle any timestamp format from backend
 * @performance: O(1) with type checking
 */
export const normalizeTimestamp = (value: TimestampOrString): DateString => {
  if (value instanceof Timestamp) {
    return timestampToString(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
};

/**
 * @purpose: Format date for UI display
 * @performance: O(1) with Intl API
 */
export const formatDate = (date: DateString | Timestamp): string => {
  const dateObj = date instanceof Timestamp ? date.toDate() : new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
}; 