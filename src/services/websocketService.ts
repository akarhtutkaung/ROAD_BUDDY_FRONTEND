import { io, Socket } from 'socket.io-client';
import { getWebSocketUrl } from '@/config/environment';
import { Location as LocationType } from '@/stores/TripStore';
import { EmergencyAlert } from '@/services/emergencyService';
import { StatusUpdate } from '@/services/statusService';

export interface WebSocketEvents {
  // Incoming events
  'location-update': (data: { userId: string; location: LocationType }) => void;
  'member-joined': (data: { member: any }) => void;
  'member-left': (data: { userId: string }) => void;
  'stop-suggested': (data: { stop: any; suggestedBy: string }) => void;
  'stop-vote': (data: { stopId: string; userId: string; vote: 'yes' | 'no' }) => void;
  'stop-agreed': (data: { stop: any }) => void;
  'member-arrived': (data: { stopId: string; userId: string }) => void;
  'member-ready': (data: { stopId: string; userId: string }) => void;
  'all-ready': (data: { stopId: string }) => void;
  'emergency-alert': (data: EmergencyAlert) => void;
  'status-update': (data: { userId: string; status: StatusUpdate }) => void;
  'auto-alert': (data: { type: string; message: string; userId?: string }) => void;

  // Outgoing events
  'authenticate': (data: { token: string }) => void;
  'join-trip': (data: { tripId: string }) => void;
  'leave-trip': (data: { tripId: string }) => void;
  'update-location': (data: LocationType) => void;
  'suggest-stop': (data: any) => void;
  'vote-stop': (data: { stopId: string; vote: 'yes' | 'no' }) => void;
  'mark-arrived': (data: { stopId: string }) => void;
  'mark-ready': (data: { stopId: string }) => void;
  'send-emergency': (data: EmergencyAlert) => void;
  'update-status': (data: StatusUpdate) => void;
}

export class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private connected: boolean = false;
  private currentTripId: string | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  async connect(token?: string): Promise<void> {
    try {
      const wsUrl = getWebSocketUrl();

      this.socket = io(wsUrl, {
        auth: token ? { token } : undefined,
        transports: ['websocket', 'polling'],
        timeout: 5000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.connected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.handleReconnect();
      });

      // Set up event listeners
      this.setupEventListeners();

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      throw error;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Location updates
    this.socket.on('location-update', (data) => {
      console.log('Location update received:', data);
      // TODO: Update trip store with new location
    });

    // Member events
    this.socket.on('member-joined', (data) => {
      console.log('Member joined:', data);
      // TODO: Update trip store with new member
    });

    this.socket.on('member-left', (data) => {
      console.log('Member left:', data);
      // TODO: Update trip store
    });

    // Stop coordination events
    this.socket.on('stop-suggested', (data) => {
      console.log('Stop suggested:', data);
      // TODO: Show stop suggestion notification
    });

    this.socket.on('stop-vote', (data) => {
      console.log('Stop vote:', data);
      // TODO: Update stop vote count
    });

    this.socket.on('stop-agreed', (data) => {
      console.log('Stop agreed:', data);
      // TODO: Update navigation to new stop
    });

    // Emergency events
    this.socket.on('emergency-alert', (data) => {
      console.log('Emergency alert:', data);
      // TODO: Show emergency notification
    });

    // Status events
    this.socket.on('status-update', (data) => {
      console.log('Status update:', data);
      // TODO: Update member status
    });

    // Auto-alerts
    this.socket.on('auto-alert', (data) => {
      console.log('Auto-alert:', data);
      // TODO: Show system alert
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);

      setTimeout(() => {
        if (this.socket && !this.connected) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  async joinTrip(tripId: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    this.currentTripId = tripId;

    return new Promise((resolve, reject) => {
      this.socket!.emit('join-trip', { tripId }, (response: any) => {
        if (response?.success) {
          console.log('Joined trip room:', tripId);
          resolve();
        } else {
          reject(new Error(response?.error || 'Failed to join trip'));
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Join trip timeout'));
      }, 5000);
    });
  }

  async leaveTrip(): Promise<void> {
    if (!this.socket || !this.isConnected || !this.currentTripId) {
      return;
    }

    return new Promise((resolve) => {
      this.socket!.emit('leave-trip', { tripId: this.currentTripId }, (response: any) => {
        if (response?.success) {
          console.log('Left trip room:', this.currentTripId);
        }
        this.currentTripId = null;
        resolve();
      });
    });
  }

  async updateLocation(location: LocationType): Promise<void> {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, location update skipped');
      return;
    }

    this.socket.emit('update-location', location);
  }

  async suggestStop(stopData: any): Promise<void> {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, stop suggestion skipped');
      return;
    }

    this.socket.emit('suggest-stop', stopData);
  }

  async voteOnStop(stopId: string, vote: 'yes' | 'no'): Promise<void> {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, vote skipped');
      return;
    }

    this.socket.emit('vote-stop', { stopId, vote });
  }

  async markArrived(stopId: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, arrival skipped');
      return;
    }

    this.socket.emit('mark-arrived', { stopId });
  }

  async markReady(stopId: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, ready status skipped');
      return;
    }

    this.socket.emit('mark-ready', { stopId });
  }

  async sendEmergency(emergencyData: EmergencyAlert): Promise<void> {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, emergency skipped');
      return;
    }

    this.socket.emit('send-emergency', emergencyData);
  }

  async updateStatus(statusData: StatusUpdate): Promise<void> {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, status update skipped');
      return;
    }

    this.socket.emit('update-status', statusData);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.currentTripId = null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getCurrentTripId(): string | null {
    return this.currentTripId;
  }

  // Get connection status for UI
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.socket) return 'disconnected';
    if (this.connected) return 'connected';
    return 'connecting';
  }
}

export default WebSocketService;
