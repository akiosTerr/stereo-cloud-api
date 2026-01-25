import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async create(email: string, name: string, password: string, channel_name: string) {
    const hash = await bcrypt.hash(password, 10);
    const user = this.repo.create({ email, name, password: hash, channel_name });
    return this.repo.save(user);
  }

  async findByEmail(email: string) {
    return this.repo.findOne({ where: { email } });
  }

  async validatePassword(email: string, plainPassword: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const match = await bcrypt.compare(plainPassword, user.password);
    return match ? user : null;
  }

  findAll() {
    return this.repo.find();
  }

  findOne(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}