import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  create(@Body() createApplicationDto: CreateApplicationDto) {
    return this.applicationsService.create(createApplicationDto);
  }

  @Get()
  findAll() {
    return this.applicationsService.findAll();
  }

  // ✅ FIX: pipeline MUST come before :id
  @Get('pipeline')
  getPipeline() {
    return this.applicationsService.groupByStatus();
  }

  @Get('job/:jobId')
  findByJob(@Param('jobId') jobId: string) {
    return this.applicationsService.findByJobId(jobId);
  }

  @Get('candidate/:candidateId')
  findByCandidate(@Param('candidateId') candidateId: string) {
    return this.applicationsService.findByCandidateId(candidateId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(id, body.status);
  }

  // Backwards-compatible alias
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateApplicationDto) {
    return this.applicationsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.applicationsService.remove(id);
  }
}