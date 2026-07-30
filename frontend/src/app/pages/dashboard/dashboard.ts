import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WorkflowService } from '../../core/services/workflow.service';
import { DepartmentService } from '../../core/services/department.service';
import { AuthService } from '../../core/services/auth.service';
import { ActivityService } from '../../core/services/activity.service';
import { FormatEnumPipe } from '../../shared/pipes/format-enum.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink, FormatEnumPipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly workflowService = inject(WorkflowService);
  private readonly departmentService = inject(DepartmentService);
  private readonly activityService = inject(ActivityService);
  readonly authService = inject(AuthService);

  loading = signal(true);
  myQueue = signal<any[]>([]);
  departmentMap = signal<Record<string, string>>({});
  
  // Aggregated stats
  totalWorkflows = signal(0);
  inProgressCount = signal(0);
  reviewCount = signal(0);
  completedCount = signal(0);
  
  // Department workloads
  departmentWorkloads = signal<Array<{ departmentId: string; departmentName: string; count: number }>>([]);

  // Activities signal
  activities = signal<any[]>([]);
  private pollTimer: any;

  ngOnInit(): void {
    this.loadDashboardData();
    this.startPollingActivities();
  }

  ngOnDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
  }

  loadDashboardData(): void {
    this.loading.set(true);
    
    // First, load departments to map IDs to names
    this.departmentService.all().subscribe({
      next: (deptRes) => {
        const map: Record<string, string> = {};
        if (deptRes.success && Array.isArray(deptRes.data)) {
          deptRes.data.forEach((d: any) => {
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

  private fetchStats(): void {
    // Fetch dashboard group statistics
    this.workflowService.dashboard().subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          let total = 0;
          let inProg = 0;
          let review = 0;
          let completed = 0;
          const deptCounts: Record<string, number> = {};

          res.data.forEach((group: any) => {
            const count = group._count?._all || 0;
            total += count;

            if (group.status === 'IN_PROGRESS') inProg += count;
            else if (group.status === 'REVIEW') review += count;
            else if (group.status === 'COMPLETED' || group.status === 'APPROVED') completed += count;

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

  private startPollingActivities(): void {
    this.fetchActivities();
    this.pollTimer = setInterval(() => {
      this.fetchActivities();
    }, 5000);
  }

  private fetchActivities(): void {
    this.activityService.all(15).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          this.activities.set(res.data);
        }
      }
    });
  }

  getActivityIcon(action: string): string {
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
}
