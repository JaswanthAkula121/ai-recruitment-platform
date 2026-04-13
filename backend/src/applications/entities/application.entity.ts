import { CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, Column, JoinColumn } from 'typeorm';
import { Job } from '../../jobs/entities/job.entity';
import { Candidate } from '../../candidates/entities/candidate.entity';

export type ApplicationStatus = 'applied' | 'interview' | 'hired' | 'rejected';

@Entity()
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  jobId: string;

  @Column('uuid')
  candidateId: string;

  @Column({ type: 'varchar', default: 'applied' })
  status: ApplicationStatus;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'jobId' })
  job: Job;

  @ManyToOne(() => Candidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate: Candidate;
}
