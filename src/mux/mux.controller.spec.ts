import { Test, TestingModule } from '@nestjs/testing';
import { MuxController } from './mux.controller';
import { MuxService } from './mux.service';

describe('MuxController', () => {
  let controller: MuxController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MuxController],
      providers: [MuxService],
    }).compile();

    controller = module.get<MuxController>(MuxController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
