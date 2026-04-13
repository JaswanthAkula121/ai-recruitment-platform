import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application, ApplicationStatus } from './entities/application.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

const ALLOWED_APPLICATION_STATUSES: ApplicationStatus[] = [
  'applied',
  'interview',
  'hired',
  'rejected',
];

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationsRepository: Repository<Application>,
  ) {}

  async create(createApplicationDto: CreateApplicationDto): Promise<Application> {
    const application = this.applicationsRepository.create({
      ...createApplicationDto,
      status: createApplicationDto.status ?? 'applied',
    });
    return this.applicationsRepository.save(application);
  }

  findAll(): Promise<Application[]> {
    return this.applicationsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Application> {
    const application = await this.applicationsRepository.findOne({ where: { id } });
    if (!application) {
      throw new NotFoundException(`Application with id "${id}" not found`);
    }
    return application;
  }

  findByJobId(jobId: string): Promise<Application[]> {
    return this.applicationsRepository.find({
      where: { jobId },
      order: { createdAt: 'DESC' },
    });
  }

  findByCandidateId(candidateId: string): Promise<Application[]> {
    return this.applicationsRepository.find({
      where: { candidateId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<Application> {
    if (!ALLOWED_APPLICATION_STATUSES.includes(status)) {
      throw new BadRequestException(
        `Invalid status "${status}". Allowed values: ${ALLOWED_APPLICATION_STATUSES.join(', ')}`,
      );
    }

    const application = await this.applicationsRepository.findOne({ where: { id } });
    if (!application) {
      throw new NotFoundException(`Application with id "${id}" not found`);
    }

    application.status = status;
    return this.applicationsRepository.save(application);
  }

  async update(id: string, updateDto: UpdateApplicationDto): Promise<Application> {
    const application = await this.applicationsRepository.findOne({ where: { id } });
    if (!application) {
      throw new NotFoundException(`Application with id "${id}" not found`);
    }

    if (updateDto.status !== undefined) {
      return this.updateStatus(id, updateDto.status);
    }

    return application;
  }

  async remove(id: string): Promise<void> {
    const application = await this.applicationsRepository.findOne({ where: { id } });
    if (!application) {
      throw new NotFoundException(`Application with id "${id}" not found`);
    }

    await this.applicationsRepository.remove(application);
  }
  async groupByStatus() {
    const applications = await this.applicationsRepository.find();
  
    const result: Record<ApplicationStatus, Application[]> = {
      applied: [],
      interview: [],
      hired: [],
      rejected: [],
    };
  
    for (const app of applications) {
      const status: ApplicationStatus = app.status ?? 'applied';
  
      if (result[status]) {
        result[status].push(app);
      }
    }
  
    return result;
  }
}
