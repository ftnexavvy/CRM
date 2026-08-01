import re

with open('frontend/src/app/pages/workflows/workflows.ts', 'r') as f:
    content = f.read()

# 1. Update getCalculatedTaskDueDate
old_calc = '''  // Automatic Due Date Calculator based on Billing Cycle
  getCalculatedTaskDueDate(task: any, wf: any): Date {
    if (task?.dueDate) return new Date(task.dueDate);

    const start = wf?.createdAt ? new Date(wf.createdAt) : new Date();
    const tasks = wf?.tasks || [];
    const index = tasks.findIndex((t: any) => t.id === task?.id);
    const total = Math.max(tasks.length, 1);

    // Spread across 30-day billing cycle
    const offsetDays = Math.floor(((index + 1) / (total + 1)) * 30);
    const calculated = new Date(start);
    calculated.setDate(calculated.getDate() + offsetDays);
    return calculated;
  }'''

new_calc = '''  // Get Task Due Date directly from backend
  getCalculatedTaskDueDate(task: any, wf: any): Date | null {
    if (task?.dueDate) return new Date(task.dueDate);
    return null; // Fallback if no due date was assigned
  }'''

if old_calc in content:
    content = content.replace(old_calc, new_calc)

# 2. Add Campaign Metrics and Overdue checker
metrics_code = '''  // Campaign Metrics
  getCampaignMetrics() {
    const wf = this.selectedWorkflow();
    if (!wf || !wf.tasks) return { totalPosts: 0, completedPosts: 0, remainingPosts: 0, totalReels: 0, completedReels: 0, remainingReels: 0, progressPercent: 0 };

    let totalPosts = 0;
    let completedPosts = 0;
    let totalReels = 0;
    let completedReels = 0;
    let totalCampaignTasks = 0;
    let completedCampaignTasks = 0;

    for (const task of wf.tasks) {
       // Identify posts
       if (task.title?.includes("Design Post") || task.title?.includes("Design Carousel") || task.title?.includes("Design Story")) {
           totalPosts++;
           totalCampaignTasks++;
           if (task.status === 'COMPLETED' || task.status === 'APPROVED') {
               completedPosts++;
               completedCampaignTasks++;
           }
       }
       // Identify reels
       if (task.title?.includes("Edit Reel") || task.title?.includes("Design Reel Cover")) {
           totalReels++;
           totalCampaignTasks++;
           if (task.status === 'COMPLETED' || task.status === 'APPROVED') {
               completedReels++;
               completedCampaignTasks++;
           }
       }
    }

    const progressPercent = totalCampaignTasks > 0 ? Math.round((completedCampaignTasks / totalCampaignTasks) * 100) : 0;

    return {
        totalPosts,
        completedPosts,
        remainingPosts: totalPosts - completedPosts,
        totalReels,
        completedReels,
        remainingReels: totalReels - completedReels,
        progressPercent
    };
  }

  isTaskOverdue(task: any): boolean {
    if (task.status === 'COMPLETED' || task.status === 'APPROVED') return false;
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // compare days
    due.setHours(0, 0, 0, 0);
    return due < today;
  }
'''

if 'getCampaignMetrics' not in content:
    content = content.replace('  // Priority widgets aggregation: Today, Tomorrow, Overdue tasks', metrics_code + '\n  // Priority widgets aggregation: Today, Tomorrow, Overdue tasks')

# 3. Update todayPriorityTasks logic to use the strict due date
old_today = '''    for (const task of tasks) {
      if (task.status === 'COMPLETED' || task.status === 'APPROVED') continue;

      const dueDate = this.getCalculatedTaskDueDate(task, wf);
      const dueStr = dueDate.toDateString();

      if (dueDate < new Date() && dueStr !== todayStr) {
        overdue.push({ ...task, computedDueDate: dueDate });
      } else if (dueStr === todayStr || task.status === 'IN_PROGRESS') {
        today.push({ ...task, computedDueDate: dueDate });
      } else if (dueStr === tomorrowStr) {
        tom.push({ ...task, computedDueDate: dueDate });
      }
    }'''

new_today = '''    for (const task of tasks) {
      if (task.status === 'COMPLETED' || task.status === 'APPROVED') continue;

      const dueDate = this.getCalculatedTaskDueDate(task, wf);
      if (!dueDate) continue;
      const dueStr = dueDate.toDateString();
      
      const due = new Date(dueDate);
      const now = new Date();
      due.setHours(0, 0, 0, 0);
      now.setHours(0, 0, 0, 0);

      if (due < now) {
        overdue.push({ ...task, computedDueDate: dueDate });
      } else if (dueStr === todayStr || task.status === 'IN_PROGRESS') {
        today.push({ ...task, computedDueDate: dueDate });
      } else if (dueStr === tomorrowStr) {
        tom.push({ ...task, computedDueDate: dueDate });
      }
    }'''
content = content.replace(old_today, new_today)

with open('frontend/src/app/pages/workflows/workflows.ts', 'w') as f:
    f.write(content)
