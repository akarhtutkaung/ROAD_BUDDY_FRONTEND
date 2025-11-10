export interface StatusUpdate {
  id: string;
  userId: string;
  tripId: string;
  status: StatusType;
  message?: string;
  timestamp: Date;
  expiresAt?: Date;
}

export type StatusType =
  | 'need_gas'
  | 'bathroom_break'
  | 'grabbing_food'
  | 'coffee_stop'
  | 'power_nap'
  | 'car_trouble'
  | 'all_good'
  | 'custom'
  | 'driving'
  | 'rest_stop'
  | 'food_stop'
  | 'gas_stop'
  | 'scenic_stop'
  | 'waiting';

export interface StatusConfig {
  id: StatusType;
  label: string;
  emoji: string;
  color: string;
  category: 'need' | 'activity' | 'issue' | 'positive';
  urgent?: boolean;
  estimatedDuration?: number; // in minutes
}

export class StatusService {
  private static instance: StatusService;
  private activeStatuses: Map<string, StatusUpdate> = new Map(); // userId -> StatusUpdate

  static getInstance(): StatusService {
    if (!StatusService.instance) {
      StatusService.instance = new StatusService();
    }
    return StatusService.instance;
  }

  // Get all available status configurations
  getStatusConfigs(): StatusConfig[] {
    return [
      {
        id: 'need_gas',
        label: 'Need gas',
        emoji: '⛽',
        color: '#ff9500',
        category: 'need',
        estimatedDuration: 10,
      },
      {
        id: 'bathroom_break',
        label: 'Bathroom break',
        emoji: '🚽',
        color: '#007aff',
        category: 'need',
        estimatedDuration: 5,
      },
      {
        id: 'grabbing_food',
        label: 'Grabbing food',
        emoji: '🍔',
        color: '#ff3b30',
        category: 'activity',
        estimatedDuration: 20,
      },
      {
        id: 'coffee_stop',
        label: 'Coffee stop',
        emoji: '☕',
        color: '#8e44ad',
        category: 'activity',
        estimatedDuration: 15,
      },
      {
        id: 'power_nap',
        label: 'Power nap',
        emoji: '💤',
        color: '#34495e',
        category: 'activity',
        estimatedDuration: 30,
      },
      {
        id: 'car_trouble',
        label: 'Car trouble',
        emoji: '🔧',
        color: '#e74c3c',
        category: 'issue',
        urgent: true,
        estimatedDuration: 45,
      },
      {
        id: 'all_good',
        label: 'All good',
        emoji: '✅',
        color: '#27ae60',
        category: 'positive',
        estimatedDuration: 0,
      },
      {
        id: 'driving',
        label: 'Driving',
        emoji: '🚗',
        color: '#007AFF',
        category: 'activity',
        estimatedDuration: 0,
      },
      {
        id: 'rest_stop',
        label: 'Rest Stop',
        emoji: '☕',
        color: '#FF9500',
        category: 'activity',
        estimatedDuration: 15,
      },
      {
        id: 'food_stop',
        label: 'Food Stop',
        emoji: '🍔',
        color: '#FF3B30',
        category: 'activity',
        estimatedDuration: 25,
      },
      {
        id: 'gas_stop',
        label: 'Gas Stop',
        emoji: '⛽',
        color: '#34C759',
        category: 'need',
        estimatedDuration: 10,
      },
      {
        id: 'scenic_stop',
        label: 'Scenic Stop',
        emoji: '📸',
        color: '#AF52DE',
        category: 'activity',
        estimatedDuration: 20,
      },
      {
        id: 'waiting',
        label: 'Waiting',
        emoji: '⏳',
        color: '#FFCC00',
        category: 'activity',
        estimatedDuration: 5,
      },
    ];
  }

  // Set user status
  setUserStatus(userId: string, tripId: string, status: StatusType, message?: string): StatusUpdate {
    const config = this.getStatusConfigs().find(s => s.id === status);
    if (!config) {
      throw new Error(`Invalid status type: ${status}`);
    }

    const statusUpdate: StatusUpdate = {
      id: `status_${Date.now()}_${userId}`,
      userId,
      tripId,
      status,
      message,
      timestamp: new Date(),
      expiresAt: config.estimatedDuration
        ? new Date(Date.now() + config.estimatedDuration * 60 * 1000)
        : undefined,
    };

    this.activeStatuses.set(userId, statusUpdate);
    return statusUpdate;
  }

  // Get user status
  getUserStatus(userId: string): StatusUpdate | null {
    const status = this.activeStatuses.get(userId);
    if (!status) return null;

    // Check if status has expired
    if (status.expiresAt && new Date() > status.expiresAt) {
      this.clearUserStatus(userId);
      return null;
    }

    return status;
  }

  // Clear user status
  clearUserStatus(userId: string): void {
    this.activeStatuses.delete(userId);
  }

  // Get all active statuses for a trip
  getTripStatuses(tripId: string): StatusUpdate[] {
    const tripStatuses: StatusUpdate[] = [];

    for (const status of this.activeStatuses.values()) {
      if (status.tripId === tripId) {
        // Check if status has expired
        if (status.expiresAt && new Date() > status.expiresAt) {
          this.activeStatuses.delete(status.userId);
        } else {
          tripStatuses.push(status);
        }
      }
    }

    return tripStatuses;
  }

  // Get status display info
  getStatusDisplayInfo(status: StatusType): StatusConfig | null {
    return this.getStatusConfigs().find(s => s.id === status) || null;
  }

  // Check if status requires urgent attention
  isUrgentStatus(status: StatusType): boolean {
    const config = this.getStatusDisplayInfo(status);
    return config?.urgent || false;
  }

  // Get status summary for member card
  getStatusSummary(userId: string): { emoji: string; label: string; color: string } | null {
    const status = this.getUserStatus(userId);
    if (!status) return null;

    const config = this.getStatusDisplayInfo(status.status);
    if (!config) return null;

    return {
      emoji: config.emoji,
      label: config.label,
      color: config.color,
    };
  }

  // Auto-clear expired statuses
  cleanupExpiredStatuses(): void {
    const now = new Date();
    for (const [userId, status] of this.activeStatuses.entries()) {
      if (status.expiresAt && now > status.expiresAt) {
        this.activeStatuses.delete(userId);
      }
    }
  }

  // Get suggested status based on context
  suggestStatusBasedOnLocation(location: any, previousLocation: any): StatusType | null {
    // If user has been stopped for a while, suggest they might need something
    const timeStopped = (new Date().getTime() - (previousLocation?.timestamp || 0)) / (1000 * 60);

    if (timeStopped > 15 && !location.isMoving) {
      // Could suggest bathroom break or food
      return 'bathroom_break';
    }

    return null;
  }

  // Get status-based call priority
  shouldPrioritizeCall(status: StatusType): boolean {
    const urgentStatuses: StatusType[] = ['car_trouble', 'need_gas'];
    return urgentStatuses.includes(status);
  }

  // Format status for display
  formatStatusForDisplay(status: StatusUpdate): string {
    const config = this.getStatusDisplayInfo(status.status);
    if (!config) return 'Unknown status';

    let display = `${config.emoji} ${config.label}`;

    if (status.message) {
      display += `: ${status.message}`;
    }

    return display;
  }

  // Get status duration
  getStatusDuration(userId: string): number | null {
    const status = this.getUserStatus(userId);
    if (!status) return null;

    return (new Date().getTime() - status.timestamp.getTime()) / (1000 * 60); // minutes
  }

  // Batch update statuses for multiple users
  updateMultipleUserStatuses(updates: Array<{ userId: string; tripId: string; status: StatusType; message?: string }>): StatusUpdate[] {
    const results: StatusUpdate[] = [];

    for (const update of updates) {
      try {
        const statusUpdate = this.setUserStatus(update.userId, update.tripId, update.status, update.message);
        results.push(statusUpdate);
      } catch (error) {
        console.error(`Error updating status for user ${update.userId}:`, error);
      }
    }

    return results;
  }
}

export default StatusService;
