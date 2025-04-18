import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async create(email: string, name: string) {
    const user = this.repo.create({ email, name });
    return this.repo.save(user);
  }

  findAll() {
    return this.repo.find({ relations: ['videos'] });
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id }, relations: ['videos'] });
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}