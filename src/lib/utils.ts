import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isBoosted = (item: any) => {
  if (!item.boostExpiresAt) return false;
  const expiry = item.boostExpiresAt.seconds 
    ? new Date(item.boostExpiresAt.seconds * 1000) 
    : new Date(item.boostExpiresAt);
  return expiry > new Date();
};

export const calculateDistance = (lat1: number, lon1: number, lat2?: number, lon2?: number) => {
  if (lat2 === undefined || lon2 === undefined) return Infinity;
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const formatDistance = (dist: number) => {
  if (dist === Infinity) return "";
  if (dist < 1) return `${(dist * 1000).toFixed(0)}m`;
  return `${dist.toFixed(1)}km`;
};
