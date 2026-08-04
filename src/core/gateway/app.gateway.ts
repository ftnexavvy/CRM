import { Inject, Logger, forwardRef } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';
import { AuthService } from '../../modules/auth/services/auth.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class AppGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AppGateway.name);

  constructor(
    @Inject(forwardRef(() => AuthService)) private readonly authService: AuthService
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromHeader(client);
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.authService.verifyAccessToken(token);
      if (!payload) {
        client.disconnect();
        return;
      }

      // Join a room specific to this user for private messages
      client.join(`user_${payload.id}`);
      // Join a room specific to the company for broadcast messages
      client.join(`company_${payload.company.id}`);
      this.logger.log(`Client connected: ${client.id} (User: ${payload.id}, Company: ${payload.company.id})`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('trigger_remote_call')
  async handleRemoteCall(client: Socket, data: { phone: string; name?: string }) {
    const token = this.extractTokenFromHeader(client);
    if (!token) return;
    const user = await this.authService.verifyAccessToken(token);
    if (user) {
      this.logger.log(`Broadcasting remote call to user_${user.id} for phone ${data.phone}`);
      this.server.to(`user_${user.id}`).emit('incoming_remote_call', {
        phone: data.phone,
        name: data.name,
        senderSocketId: client.id,
      });
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.split(' ')[0] === 'Bearer') {
      return authHeader.split(' ')[1];
    }
    const tokenQuery = client.handshake.query.token as string;
    if (tokenQuery) {
        return tokenQuery;
    }
    return undefined;
  }

  // Helper methods to emit events
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }

  emitToCompany(companyId: string, event: string, data: any) {
    this.server.to(`company_${companyId}`).emit(event, data);
  }

  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}

