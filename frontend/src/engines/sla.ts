import type { Complaint, SLAInfo } from '@/types';

const SLA_HOURS: Record<string, number> = {
  Critical: 24,
  High: 48,
  Medium: 72,
  Low: 120,
};

export function getSlaHours(priorityLevel: string): number {
  return SLA_HOURS[priorityLevel] ?? 72;
}

export function calculateSlaDeadline(createdAt: string, priorityLevel: string): string {
  const hours = getSlaHours(priorityLevel);
  const created = new Date(createdAt);
  return new Date(created.getTime() + hours * 3600_000).toISOString();
}

export function getSlaInfo(complaint: Complaint, now: Date = new Date()): SLAInfo {
  const slaHours = getSlaHours(complaint.priorityLevel);
  const deadline = new Date(complaint.slaDeadline);
  const diffMs = deadline.getTime() - now.getTime();
  const hoursRemaining = diffMs / 3600_000;

  let status: SLAInfo['status'];
  if (complaint.status === 'Resolved') {
    status = 'Within SLA';
  } else if (hoursRemaining < 0) {
    status = 'SLA Breached';
  } else if (hoursRemaining < slaHours * 0.25) {
    status = 'Approaching Deadline';
  } else {
    status = 'Within SLA';
  }

  let timeRemaining: string;
  if (hoursRemaining < 0) {
    const overdue = Math.abs(hoursRemaining);
    if (overdue < 24) {
      timeRemaining = `${Math.round(overdue)}h overdue`;
    } else {
      timeRemaining = `${Math.floor(overdue / 24)}d ${Math.round(overdue % 24)}h overdue`;
    }
  } else if (hoursRemaining < 1) {
    timeRemaining = `${Math.round(hoursRemaining * 60)}m remaining`;
  } else if (hoursRemaining < 24) {
    timeRemaining = `${Math.round(hoursRemaining)}h remaining`;
  } else {
    timeRemaining = `${Math.floor(hoursRemaining / 24)}d ${Math.round(hoursRemaining % 24)}h remaining`;
  }

  return {
    slaHours,
    deadline: complaint.slaDeadline,
    status,
    timeRemaining,
    hoursRemaining,
  };
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const hours = diff / 3600_000;
  if (hours < 1) return `${Math.round(diff / 60000)}m ago`;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
