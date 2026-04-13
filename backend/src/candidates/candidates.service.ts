import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Candidate } from './entities/candidate.entity';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

@Injectable()
export class CandidatesService {
  constructor(
    @InjectRepository(Candidate)
    private readonly candidatesRepository: Repository<Candidate>,
  ) {}

  create(createCandidateDto: CreateCandidateDto): Promise<Candidate> {
    const candidate =
      this.candidatesRepository.create(createCandidateDto);
    return this.candidatesRepository.save(candidate);
  }

  findAll(): Promise<Candidate[]> {
    return this.candidatesRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Candidate> {
    const candidate = await this.candidatesRepository.findOne({ where: { id } });
    if (!candidate) {
      throw new NotFoundException(`Candidate with id "${id}" not found`);
    }
    return candidate;
  }

  async update(id: string, updateDto: UpdateCandidateDto): Promise<Candidate> {
    const candidate = await this.findOne(id);
    Object.assign(candidate, updateDto);
    return this.candidatesRepository.save(candidate);
  }

  async remove(id: string): Promise<void> {
    const candidate = await this.findOne(id);
    await this.candidatesRepository.remove(candidate);
  }
}
