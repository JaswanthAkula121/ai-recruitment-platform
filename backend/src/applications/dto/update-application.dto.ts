import { ApplicationStatus } from '../entities/application.entity';

export class UpdateApplicationDto {
  status?: ApplicationStatus;
}
