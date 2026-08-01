with open('frontend/src/app/pages/workflows/workflows.html', 'r') as f:
    content = f.read()

# 1. Add Campaign Metrics card in the Dashboard tab (after Today's priority widget)
priority_widget_end = '''          </div>
        </div>

            <!-- ── CLIENT & BILLING CYCLE HEADER CARD ───────────────── -->'''

metrics_card = '''          </div>
        </div>

        <!-- ── CAMPAIGN PROGRESS & DELIVERABLES ───────────────── -->
        <div class="card wf-campaign-metrics-widget" style="margin-top: 20px;">
          <div class="priority-widget-header">
            <div class="priority-title">
              <span class="priority-icon">📊</span>
              <strong>Campaign Progress</strong>
            </div>
            <div class="priority-sub">Overall Completion: {{ getCampaignMetrics().progressPercent }}%</div>
          </div>
          
          <div class="priority-columns" style="display: flex; gap: 20px; padding: 15px;">
             <!-- POSTS -->
             <div class="priority-col" style="flex: 1; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 15px;">
               <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 10px; color: var(--text-color);">📱 Static Posts / Carousels</div>
               <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Total:</span> <strong>{{ getCampaignMetrics().totalPosts }}</strong></div>
               <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Completed:</span> <strong class="text-success">{{ getCampaignMetrics().completedPosts }}</strong></div>
               <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Remaining:</span> <strong class="text-warning">{{ getCampaignMetrics().remainingPosts }}</strong></div>
             </div>

             <!-- REELS -->
             <div class="priority-col" style="flex: 1; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 15px;">
               <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 10px; color: var(--text-color);">🎬 Reels & Videos</div>
               <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Total:</span> <strong>{{ getCampaignMetrics().totalReels }}</strong></div>
               <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Completed:</span> <strong class="text-success">{{ getCampaignMetrics().completedReels }}</strong></div>
               <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>Remaining:</span> <strong class="text-warning">{{ getCampaignMetrics().remainingReels }}</strong></div>
             </div>
             
             <!-- PROGRESS -->
             <div class="priority-col" style="flex: 1; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 8px; padding: 15px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
               <div style="font-size: 1.1rem; font-weight: 600; margin-bottom: 15px; color: var(--text-color);">Overall Progress</div>
               <div style="width: 100px; height: 100px; border-radius: 50%; background: conic-gradient(var(--primary-color) {{ getCampaignMetrics().progressPercent }}%, var(--border-color) 0); display: flex; justify-content: center; align-items: center; position: relative;">
                  <div style="width: 80px; height: 80px; background: var(--bg-color); border-radius: 50%; position: absolute; top: 10px; left: 10px;"></div>
                  <strong style="position: relative; z-index: 2; font-size: 1.2rem;">{{ getCampaignMetrics().progressPercent }}%</strong>
               </div>
             </div>
          </div>
        </div>

            <!-- ── CLIENT & BILLING CYCLE HEADER CARD ───────────────── -->'''

content = content.replace(priority_widget_end, metrics_card)

# 2. Add OVERDUE badge inside tasks loop (in tasks tab)
# Find the task card title row
old_task_title = '''                      <div class="task-info">
                        <h4>{{ task.title }}</h4>
                        <span class="task-dept-badge">{{ task.departmentName || task.serviceName || 'Task' }}</span>
                      </div>'''

new_task_title = '''                      <div class="task-info">
                        <h4>{{ task.title }}</h4>
                        <div style="display: flex; gap: 8px; align-items: center;">
                           <span class="task-dept-badge">{{ task.departmentName || task.serviceName || 'Task' }}</span>
                           @if (isTaskOverdue(task)) {
                             <span class="task-dept-badge" style="background-color: #ffebee; color: #d32f2f; border: 1px solid #ef9a9a; font-weight: bold;">⚠️ OVERDUE</span>
                           }
                        </div>
                      </div>'''

content = content.replace(old_task_title, new_task_title)

# Add OVERDUE text in the "Due: " section of the task card
old_task_due = '''                      <div class="task-meta-row">
                        <span class="meta-item"><span class="meta-icon">👤</span> {{ task.assignedToId ? getEmployeeName(task.assignedToId) : 'Unassigned' }}</span>
                        <span class="meta-item"><span class="meta-icon">📅</span> Due: {{ getCalculatedTaskDueDate(task, selectedWorkflow()) | date:'d MMM' }}</span>
                      </div>'''

new_task_due = '''                      <div class="task-meta-row">
                        <span class="meta-item"><span class="meta-icon">👤</span> {{ task.assignedToId ? getEmployeeName(task.assignedToId) : 'Unassigned' }}</span>
                        <span class="meta-item" [class.text-danger]="isTaskOverdue(task)"><span class="meta-icon">📅</span> Due: {{ getCalculatedTaskDueDate(task, selectedWorkflow()) | date:'d MMM yyyy' }}</span>
                      </div>'''

content = content.replace(old_task_due, new_task_due)

with open('frontend/src/app/pages/workflows/workflows.html', 'w') as f:
    f.write(content)
