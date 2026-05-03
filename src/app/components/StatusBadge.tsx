import React from 'react';
import { Badge } from './ui/badge';

interface StatusBadgeProps {
  status: 'confirmed' | 'pending' | 'rejected' | 'cancelled' | 'available' | 'booked' | 'maintenance';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variants = {
    confirmed: 'bg-accent/10 text-accent border-accent/20',
    pending: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    rejected: 'bg-destructive/10 text-destructive border-destructive/20',
    cancelled: 'bg-muted text-muted-foreground border-border',
    available: 'bg-accent/10 text-accent border-accent/20',
    booked: 'bg-destructive/10 text-destructive border-destructive/20',
    maintenance: 'bg-amber-500/10 text-amber-700 border-amber-500/20'
  };

  const labels = {
    confirmed: 'Confirmed',
    pending: 'Pending',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
    available: 'Available',
    booked: 'Booked',
    maintenance: 'Maintenance'
  };

  return (
    <Badge variant="outline" className={`${variants[status]} ${className}`}>
      {labels[status]}
    </Badge>
  );
}
