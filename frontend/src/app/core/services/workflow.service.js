import { __decorate } from "tslib";
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
let WorkflowService = class WorkflowService {
    http = inject(HttpClient);
    // Workflow engine endpoints
    create(workflow) {
        return this.http.post('/api/v1/workflows', workflow);
    }
    myQueue() {
        return this.http.get('/api/v1/workflows/queue/me');
    }
    dashboard() {
        return this.http.get('/api/v1/workflows/dashboard');
    }
    departmentQueue(departmentId) {
        return this.http.get(`/api/v1/workflows/department/${departmentId}`);
    }
    bySubject(subjectType, subjectId) {
        return this.http.get(`/api/v1/workflows/subject/${subjectType}/${subjectId}`);
    }
    timeline(id) {
        return this.http.get(`/api/v1/workflows/${id}/timeline`);
    }
    one(id) {
        return this.http.get(`/api/v1/workflows/${id}`);
    }
    assign(id, assignment) {
        return this.http.post(`/api/v1/workflows/${id}/assign`, assignment);
    }
    transfer(id, assignment) {
        return this.http.post(`/api/v1/workflows/${id}/transfer`, assignment);
    }
    accept(id) {
        return this.http.post(`/api/v1/workflows/${id}/accept`, {});
    }
    reject(id, remarks) {
        return this.http.post(`/api/v1/workflows/${id}/reject`, { remarks });
    }
    complete(id, remarks) {
        return this.http.post(`/api/v1/workflows/${id}/complete`, { remarks });
    }
    approve(id, remarks) {
        return this.http.post(`/api/v1/workflows/${id}/approve`, { remarks });
    }
    generateTasks(id, taskGenerator) {
        return this.http.post(`/api/v1/workflows/${id}/tasks/generate`, taskGenerator);
    }
    regenerate(id) {
        return this.http.post(`/api/v1/workflows/${id}/regenerate`, {});
    }
    delete(id) {
        return this.http.delete(`/api/v1/workflows/${id}`);
    }
    // Task-specific endpoints
    assignTask(taskId, assignedToId) {
        return this.http.post(`/api/v1/tasks/${taskId}/assign`, { assignedToId });
    }
    createCustomTask(workflowId, task) {
        return this.http.post(`/api/v1/tasks/workflow/${workflowId}/custom`, task);
    }
    commentTask(taskId, content) {
        return this.http.post(`/api/v1/tasks/${taskId}/comments`, { content });
    }
    attachTask(taskId, attachment) {
        return this.http.post(`/api/v1/tasks/${taskId}/attachments`, attachment);
    }
};
WorkflowService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], WorkflowService);
export { WorkflowService };
