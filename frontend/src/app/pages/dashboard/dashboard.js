import { __decorate } from "tslib";
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { ActivityService } from '../../core/services/activity.service';
import { FormatEnumPipe } from '../../shared/pipes/format-enum.pipe';
let DashboardComponent = class DashboardComponent {
    workflowService = inject(WorkflowService);
    departmentService = inject(DepartmentService);
    activityService = inject(ActivityService);
    authService = inject(AuthService);
    loading = signal(true);
    myQueue = signal([]);
    departmentMap = signal({});
    // Aggregated stats
    totalWorkflows = signal(0);
    inProgressCount = signal(0);
    reviewCount = signal(0);
    completedCount = signal(0);
    // Department workloads
    departmentWorkloads = signal([]);
    // Activities signal
    activities = signal([]);
    pollTimer;
    ngOnInit() {
        this.loadDashboardData();
        this.startPollingActivities();
    }
    ngOnDestroy() {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
        }
    }
    loadDashboardData() {
        this.loading.set(true);
        // First, load departments to map IDs to names
        this.departmentService.all().subscribe({
            next: (deptRes) => {
                const map = {};
                if (deptRes.success && Array.isArray(deptRes.data)) {
                    deptRes.data.forEach((d) => {
                        map[d.id] = d.name;
                    });
                }
                this.departmentMap.set(map);
                // Now load dashboard stats & my queue
                this.fetchStats();
            },
            error: () => {
                this.fetchStats();
            }
        });
    }
    fetchStats() {
        // Fetch dashboard group statistics
        this.workflowService.dashboard().subscribe({
            next: (res) => {
                if (res.success && Array.isArray(res.data)) {
                    let total = 0;
                    let inProg = 0;
                    let review = 0;
                    let completed = 0;
                    const deptCounts = {};
                    res.data.forEach((group) => {
                        const count = group._count?._all || 0;
                        total += count;
                        if (group.status === 'IN_PROGRESS')
                            inProg += count;
                        else if (group.status === 'REVIEW')
                            review += count;
                        else if (group.status === 'COMPLETED' || group.status === 'APPROVED')
                            completed += count;
                        if (group.currentDepartmentId) {
                            deptCounts[group.currentDepartmentId] = (deptCounts[group.currentDepartmentId] || 0) + count;
                        }
                    });
                    this.totalWorkflows.set(total);
                    this.inProgressCount.set(inProg);
                    this.reviewCount.set(review);
                    this.completedCount.set(completed);
                    // Format department workloads
                    const workloads = Object.entries(deptCounts).map(([id, count]) => ({
                        departmentId: id,
                        departmentName: this.departmentMap()[id] || 'General / Unassigned',
                        count
                    }));
                    this.departmentWorkloads.set(workloads);
                }
            }
        });
        // Fetch personal work queue
        this.workflowService.myQueue().subscribe({
            next: (res) => {
                if (res.success && Array.isArray(res.data)) {
                    this.myQueue.set(res.data);
                }
                this.loading.set(false);
            },
            error: () => {
                this.loading.set(false);
            }
        });
    }
    startPollingActivities() {
        this.fetchActivities();
        this.pollTimer = setInterval(() => {
            this.fetchActivities();
        }, 5000);
    }
    fetchActivities() {
        this.activityService.all(15).subscribe({
            next: (res) => {
                if (res.success && Array.isArray(res.data)) {
                    this.activities.set(res.data);
                }
            }
        });
    }
    getActivityIcon(action) {
        switch (action) {
            case 'lead_created': return '📣';
            case 'lead_assigned': return '👤';
            case 'lead_status_updated': return '📈';
            case 'lead_converted': return '🏆';
            case 'lead_deleted': return '🗑️';
            case 'workflow_created': return '⚡';
            case 'workflow_assigned': return '👥';
            case 'workflow_transferred': return '🔄';
            case 'workflow_accepted': return '✅';
            case 'workflow_completed': return '📁';
            case 'workflow_approved': return '⭐';
            case 'task_assigned': return '📋';
            case 'task_comment_added': return '💬';
            case 'task_attachment_added': return '📎';
            default: return '⚙️';
        }
    }
};
DashboardComponent = __decorate([
    Component({
        selector: 'app-dashboard',
        imports: [CommonModule, RouterLink, FormatEnumPipe],
        templateUrl: './dashboard.html',
        styleUrl: './dashboard.css'
    })
], DashboardComponent);
export { DashboardComponent };
