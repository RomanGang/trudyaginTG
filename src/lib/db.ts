// Simple in-memory database for Vercel serverless
interface User {
  id: string;
  phone: string;
  password: string;
  name: string;
  role: string;
  city: string;
  district?: string;
  rating: number;
  jobsDone: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Job {
  id: string;
  title: string;
  description: string;
  payment: number;
  category: string;
  city: string;
  district?: string;
  date: Date;
  status: string;
  employerId: string;
  workerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Response {
  id: string;
  jobId: string;
  workerId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Rating {
  id: string;
  jobId?: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

interface Message {
  id: string;
  jobId: string;
  senderId: string;
  receiverId: string;
  text: string;
  isRead: boolean;
  createdAt: Date;
}

interface SmsCode {
  id: string;
  phone: string;
  code: string;
  used: boolean;
  expiresAt: Date;
  createdAt: Date;
}

class MemoryDB {
  users: Map<string, User> = new Map();
  jobs: Map<string, Job> = new Map();
  responses: Map<string, Response> = new Map();
  ratings: Map<string, Rating> = new Map();
  messages: Map<string, Message> = new Map();
  smsCodes: Map<string, SmsCode> = new Map();
  counters: Record<string, number> = { user: 0, job: 0, response: 0, rating: 0, message: 0, smsCode: 0 };

  generateId(type: string): string {
    this.counters[type]++;
    return `${type}_${this.counters[type]}_${Date.now()}`;
  }

  createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'rating' | 'jobsDone'>): User {
    const user: User = { ...data, id: this.generateId('user'), rating: 0, jobsDone: 0, createdAt: new Date(), updatedAt: new Date() };
    this.users.set(user.id, user);
    return user;
  }

  getUserByPhone(phone: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.phone === phone);
  }

  getUserById(id: string): User | undefined {
    return this.users.get(id);
  }

  createJob(data: Omit<Job, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Job {
    const job: Job = { ...data, id: this.generateId('job'), status: 'open', createdAt: new Date(), updatedAt: new Date() };
    this.jobs.set(job.id, job);
    return job;
  }

  getJobs(filters?: { city?: string; category?: string; employerId?: string; workerId?: string; status?: string }): Job[] {
    let jobs = Array.from(this.jobs.values());
    if (filters?.city) jobs = jobs.filter(j => j.city === filters.city);
    if (filters?.category) jobs = jobs.filter(j => j.category === filters.category);
    if (filters?.employerId) jobs = jobs.filter(j => j.employerId === filters.employerId);
    if (filters?.workerId) jobs = jobs.filter(j => j.workerId === filters.workerId);
    if (filters?.status) jobs = jobs.filter(j => j.status === filters.status);
    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getJobById(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, data: Partial<Job>): Job | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    const updated = { ...job, ...data, updatedAt: new Date() };
    this.jobs.set(id, updated);
    return updated;
  }

  createResponse(data: Omit<Response, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Response {
    const response: Response = { ...data, id: this.generateId('response'), status: 'pending', createdAt: new Date(), updatedAt: new Date() };
    this.responses.set(response.id, response);
    return response;
  }

  getResponses(jobId?: string, workerId?: string): Response[] {
    let responses = Array.from(this.responses.values());
    if (jobId) responses = responses.filter(r => r.jobId === jobId);
    if (workerId) responses = responses.filter(r => r.workerId === workerId);
    return responses;
  }

  createRating(data: Omit<Rating, 'id' | 'createdAt'>): Rating {
    const rating: Rating = { ...data, id: this.generateId('rating'), createdAt: new Date() };
    this.ratings.set(rating.id, rating);
    return rating;
  }

  getRatings(userId: string): Rating[] {
    return Array.from(this.ratings.values()).filter(r => r.toUserId === userId);
  }

  createMessage(data: Omit<Message, 'id' | 'createdAt' | 'isRead'>): Message {
    const message: Message = { ...data, id: this.generateId('message'), isRead: false, createdAt: new Date() };
    this.messages.set(message.id, message);
    return message;
  }

  getMessages(jobId: string): Message[] {
    return Array.from(this.messages.values()).filter(m => m.jobId === jobId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  createSmsCode(phone: string, code: string): SmsCode {
    const smsCode: SmsCode = { id: this.generateId('smsCode'), phone, code, used: false, expiresAt: new Date(Date.now() + 5 * 60 * 1000), createdAt: new Date() };
    this.smsCodes.set(smsCode.id, smsCode);
    return smsCode;
  }

  verifySmsCode(phone: string, code: string): boolean {
    const codes = Array.from(this.smsCodes.values()).filter(c => c.phone === phone && !c.used && c.expiresAt > new Date());
    return codes.some(c => c.code === code);
  }

  markCodeUsed(phone: string): void {
    this.smsCodes.forEach(c => { if (c.phone === phone) c.used = true; });
  }

  getStats() {
    const jobs = Array.from(this.jobs.values());
    const users = Array.from(this.users.values());
    return { jobs: jobs.filter(j => j.status === 'open').length, workers: users.filter(u => u.role === 'worker').length, done: jobs.filter(j => j.status === 'completed').length };
  }
}

export const db = new MemoryDB();
