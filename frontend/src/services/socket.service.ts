import { io, Socket } from 'socket.io-client';

export interface QueueStatusUpdate {
  doctorId: string;
  date: string;
  status: 'active' | 'paused';
  message: string;
  timestamp: Date;
  adminNotification?: boolean;
}

export interface AppointmentUpdate {
  appointmentId: string;
  doctorId: string;
  patientId: string;
  action: 'rescheduled' | 'cancelled' | 'updated';
  newDate?: string;
  newTime?: string;
  reason?: string;
  message?: string;
  timestamp: Date;
  adminNotification?: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Initialize and connect to Socket.io server
   */
  connect(userId: string, userType: 'patient' | 'doctor' | 'admin'): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      // Calculate socket URL (remove /api if present)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
      const socketUrl = apiUrl.endsWith('/api') ? apiUrl.replace(/\/api$/, '') : apiUrl;

      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
      });

      this.setupEventHandlers();

      this.socket.on('connect', () => {
        console.log('Socket connected:', this.socket?.id);
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Authenticate with the server
        this.socket?.emit('authenticate', { userId, userType });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        this.isConnected = false;

        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect automatically
          return;
        }

        this.handleReconnect(userId, userType);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        this.isConnected = false;
        this.handleReconnect(userId, userType);
      });

    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  }

  /**
   * Setup event handlers for incoming messages
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
    });

    this.socket.on('queue_status_updated', (data: QueueStatusUpdate) => {
      console.log('Queue status updated:', data);
      this.handleQueueStatusUpdate(data);
    });

    this.socket.on('appointment_updated', (data: AppointmentUpdate) => {
      console.log('Appointment updated:', data);
      this.handleAppointmentUpdate(data);
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(userId: string, userType: 'patient' | 'doctor' | 'admin'): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect(userId, userType);
      }
    }, delay);
  }

  /**
   * Join a doctor's queue room (for patients)
   */
  joinDoctorQueue(doctorId: string, date: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join_doctor_queue', { doctorId, date });
      console.log(`Joined queue room for doctor ${doctorId} on ${date}`);
    }
  }

  /**
   * Leave a doctor's queue room
   */
  leaveDoctorQueue(doctorId: string, date: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave_doctor_queue', { doctorId, date });
      console.log(`Left queue room for doctor ${doctorId} on ${date}`);
    }
  }

  /**
   * Handle queue status updates
   */
  private handleQueueStatusUpdate(data: QueueStatusUpdate): void {
    // Dispatch custom events that components can listen to
    const event = new CustomEvent('queueStatusUpdated', { detail: data });
    window.dispatchEvent(event);

    // Show toast notification if it's not an admin notification
    if (!data.adminNotification) {
      this.showNotification('Queue Status Update', data.message, data.status === 'paused' ? 'warning' : 'info');
    }
  }

  /**
   * Handle appointment updates
   */
  private handleAppointmentUpdate(data: AppointmentUpdate): void {
    // Dispatch custom events that components can listen to
    const event = new CustomEvent('appointmentUpdated', { detail: data });
    window.dispatchEvent(event);

    // Show toast notification if there's a message
    if (data.message && !data.adminNotification) {
      this.showNotification('Appointment Update', data.message, data.action === 'cancelled' ? 'error' : 'info');
    }
  }

  /**
   * Show notification (you might want to use a toast library here)
   */
  private showNotification(title: string, message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): void {
    // For now, just log to console. In a real app, you'd integrate with a toast library
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);

    // You could also use browser notifications if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
      });
    }
  }

  /**
   * Subscribe to queue status updates
   */
  onQueueStatusUpdate(callback: (data: QueueStatusUpdate) => void): () => void {
    const handler = (event: CustomEvent<QueueStatusUpdate>) => {
      callback(event.detail);
    };

    window.addEventListener('queueStatusUpdated', handler as EventListener);

    // Return cleanup function
    return () => {
      window.removeEventListener('queueStatusUpdated', handler as EventListener);
    };
  }

  /**
   * Subscribe to appointment updates
   */
  onAppointmentUpdate(callback: (data: AppointmentUpdate) => void): () => void {
    const handler = (event: CustomEvent<AppointmentUpdate>) => {
      callback(event.detail);
    };

    window.addEventListener('appointmentUpdated', handler as EventListener);

    // Return cleanup function
    return () => {
      window.removeEventListener('appointmentUpdated', handler as EventListener);
    };
  }

  /**
   * Request notification permission
   */
  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Socket disconnected manually');
    }
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get connection status info
   */
  getConnectionInfo(): { connected: boolean; id?: string } {
    return {
      connected: this.isConnected,
      id: this.socket?.id,
    };
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
