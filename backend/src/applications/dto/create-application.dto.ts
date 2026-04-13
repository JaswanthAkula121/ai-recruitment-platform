import { ApplicationStatus } from '../entities/application.entity';

export class CreateApplicationDto {
  jobId: string;
  candidateId: string;
  status?: ApplicationStatus;
}
