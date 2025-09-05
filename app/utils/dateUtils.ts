/**
 * Utility functions for date formatting
 */

/**
 * Safely formats a date string to a readable format
 * @param dateString - The date string to format
 * @returns Formatted date string or "Invalid Date" if invalid
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch (error) {
    return 'Invalid Date';
  }
}

/**
 * Formats a date string to show only the date (no time)
 * @param dateString - The date string to format
 * @returns Formatted date string or "Invalid Date" if invalid
 */
export function formatDateOnly(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString();
  } catch (error) {
    return 'Invalid Date';
  }
}

/**
 * Formats a date string to show only the time
 * @param dateString - The date string to format
 * @returns Formatted time string or "Invalid Date" if invalid
 */
export function formatTimeOnly(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch (error) {
    return 'Invalid Date';
  }
}

/**
 * Formats a date string to a relative time (e.g., "2 hours ago", "3 days ago")
 * @param dateString - The date string to format
 * @returns Relative time string or "Invalid Date" if invalid
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else {
      return formatDate(dateString);
    }
  } catch (error) {
    return 'Invalid Date';
  }
} 

/**
 * Safely converts a date string to ISO date format
 * @param dateString - The date string to convert
 * @param fallback - Optional fallback date (defaults to current date)
 * @returns ISO date string (YYYY-MM-DD) or fallback
 */
export function safeDate(dateString: string | Date | null | undefined, fallback?: string): string {
  try {
    if (!dateString) {
      return fallback || new Date().toISOString().split("T")[0];
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return fallback || new Date().toISOString().split("T")[0];
    }
    
    return date.toISOString().split("T")[0];
  } catch {
    return fallback || new Date().toISOString().split("T")[0];
  }
} 