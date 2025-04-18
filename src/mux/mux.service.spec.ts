import { Test, TestingModule } from '@nestjs/testing';
import { MuxService } from './mux.service';

describe('MuxService', () => {
  let service: MuxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MuxService],
    }).compile();

    service = module.get<MuxService>(MuxService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
