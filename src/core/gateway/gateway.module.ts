import { Global, Module, forwardRef } from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { AuthModule } from '../../modules/auth/auth.module';

@Global()
@Module({
  imports: [forwardRef(() => AuthModule)],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class GatewayModule {}
