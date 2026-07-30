import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private readonly http = inject(HttpClient);

  // Workflow engine endpoints
  create(workflow: { subjectType: string; subjectId: string; title: string; currentStageKey?: string }): Observable<any> {
    return this.http.post<any>('/api/v1/workflows', workflow);
  }

  myQueue(): Observable<any> {
    return this.http.get<any>('/api/v1/workflows/queue/me');
  }

  dashboard(): Observable<any> {
    return this.http.get<any>('/api/v1/workflows/dashboard');
  }

  departmentQueue(departmentId: string): Observable<any> {
    return this.http.get<any>(`/api/v1/workflows/department/${departmentId}`);
  }

  bySubject(subjectType: string, subjectId: string): Observable<any> {
    return this.http.get<any>(`/api/v1/workflows/subject/${subjectType}/${subjectId}`);
  }

  timeline(id: string): Observable<any> {
    return this.http.get<any>(`/api/v1/workflows/${id}/timeline`);
  }

  one(id: string): Observable<any> {
    return this.http.get<any>(`/api/v1/workflows/${id}`);
  }

  assign(id: string, assignment: { assignedToId: string; departmentId: string; remarks?: string }): Observable<any> {
    return this.http.post<any>(`/api/v1/workflows/${id}/assign`, assignment);
  }

  transfer(id: string, assignment: { assignedToId: string; departmentId: string; remarks?: string }): Observable<any> {
    return this.http.post<any>(`/api/v1/workflows/${id}/transfer`, assignment);
  }

  accept(id: string): Observable<any> {
    return this.http.post<any>(`/api/v1/workflows/${id}/accept`, {});
  }

  reject(id: string, remarks?: string): Observable<any> {
    return this.http.post<any>(`/api/v1/workflows/${id}/reject`, { remarks });
  }

  complete(id: string, remarks?: string): Observable<any> {
    return this.http.post<any>(`/api/v1/workflows/${id}/complete`, { remarks });
  }

  approve(id: string, remarks?: string): Observable<any> {
    return this.http.post<any>(`/api/v1/workflows/${id}/approve`, { remarks });
  }

  generateTasks(id: string, taskGenerator: { items: Array<{ type: string; quantity: number; titlePrefix: string }> }): Observable<any> {
    return this.http.post<any>(`/api/v1/workflows/${id}/tasks/generate`, taskGenerator);
  }

  regenerate(id: string): Observable<any> {
    return this.http.post<any>(`/api/v1/workflows/${id}/regenerate`, {});
  }

  autoGenerateClientWorkflow(clientId: string): Observable<any> {
    return this.http.post<any>(`/api/v1/workflows/auto-generate/client/${clientId}`, {});
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`/api/v1/workflows/${id}`);
  }

  // Task-specific endpoints
  assignTask(taskId: string, assignedToId: string): Observable<any> {
    return this.http.post<any>(`/api/v1/tasks/${taskId}/assign`, { assignedToId });
  }

  createCustomTask(workflowId: string, task: any): Observable<any> {
    return this.http.post<any>(`/api/v1/tasks/workflow/${workflowId}/custom`, task);
  }

  commentTask(taskId: string, content: string): Observable<any> {
    return this.http.post<any>(`/api/v1/tasks/${taskId}/comments`, { content });
  }

  attachTask(taskId: string, attachment: { fileName: string; fileUrl: string; mimeType?: string }): Observable<any> {
    return this.http.post<any>(`/api/v1/tasks/${taskId}/attachments`, attachment);
  }

  updateTaskStatus(taskId: string, status: string): Observable<any> {
    return this.http.post<any>(`/api/v1/tasks/${taskId}/status`, { status });
  }
}
