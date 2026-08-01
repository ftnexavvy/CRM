import re

with open('frontend/src/app/pages/workflows/workflows.html', 'r') as f:
    content = f.read()

start_idx = content.find('<div class="wf-detail-grid">')
end_idx = content.find('</div><!-- /wf-detail-grid -->') + len('</div><!-- /wf-detail-grid -->')

grid_content = content[start_idx:end_idx]

priority_start = grid_content.find('<!-- ── TODAY\'S PRIORITY WIDGET (TOP BAR) ───────────────────── -->')
priority_end = grid_content.find('<!-- ── CLIENT & BILLING CYCLE HEADER CARD ───────────────── -->')
priority_widget = grid_content[priority_start:priority_end].strip()

header_start = grid_content.find('<!-- ── CLIENT & BILLING CYCLE HEADER CARD ───────────────── -->')
header_end = grid_content.find('<!-- ── SERVICES & TASKS CARD ───────────────────────────── -->')
header_card = grid_content[header_start:header_end].strip()

tasks_start = grid_content.find('<!-- ── SERVICES & TASKS CARD ───────────────────────────── -->')
tasks_end = grid_content.find('<!-- ── TIMELINE CARD ───────────────────────────────────── -->')
tasks_card = grid_content[tasks_start:tasks_end].strip()

timeline_start = grid_content.find('<!-- ── TIMELINE CARD ───────────────────────────────────── -->')
timeline_end = grid_content.find('</div><!-- /wf-detail-grid -->')
if timeline_end == -1:
    timeline_end = len(grid_content)
timeline_card = grid_content[timeline_start:timeline_end].strip()

actions_start = header_card.find('<!-- Actions Toolbar -->')
actions_toolbar = header_card[actions_start:header_card.rfind('</div>')].strip()
header_card_no_actions = header_card[:actions_start].strip()

header_card_no_actions = header_card_no_actions.replace('''<div class="wf-client-tag">
                <span class="client-icon">🏢</span>
                <span class="client-label">CLIENT:</span>
                <strong class="client-name-str">{{ getClientName(selectedWorkflow()) }}</strong>
              </div>
              <h2 class="wf-header-title">{{ selectedWorkflow().title }}</h2>
              
              <!-- Platform Badges -->''', '<!-- Platform Badges -->')

header_card_no_actions = header_card_no_actions.replace('''<span class="badge badge-lg" [ngClass]="selectedWorkflow().status | lowercase">
                {{ selectedWorkflow().status | formatEnum }}
              </span>''', '')

new_html = """
      <div class="wf-sticky-header card">
        <div class="wf-header-top">
          <div class="wf-header-left">
            <div class="wf-client-tag">
              <span class="client-icon">🏢</span>
              <span class="client-label">CLIENT:</span>
              <strong class="client-name-str">{{ getClientName(selectedWorkflow()) }}</strong>
            </div>
            <h2 class="wf-header-title">{{ selectedWorkflow().title }}</h2>
          </div>
          <div class="wf-header-right">
            <span class="badge badge-lg" [ngClass]="selectedWorkflow().status | lowercase">
              {{ selectedWorkflow().status | formatEnum }}
            </span>
          </div>
        </div>

        """ + actions_toolbar + """

        <div class="wf-tabs">
          <button class="wf-tab-btn" [class.active]="activeTab() === 'dashboard'" (click)="activeTab.set('dashboard')">Overview</button>
          <button class="wf-tab-btn" [class.active]="activeTab() === 'tasks'" (click)="activeTab.set('tasks')">Services & Tasks</button>
          <button class="wf-tab-btn" [class.active]="activeTab() === 'timeline'" (click)="activeTab.set('timeline')">Timeline</button>
        </div>
      </div>

      <div class="wf-tab-content">
        @if (activeTab() === 'dashboard') {
          <div class="wf-detail-grid">
            """ + priority_widget + """

            """ + header_card_no_actions + """
            </div>
          </div>
        }

        @if (activeTab() === 'tasks') {
          """ + tasks_card.replace('class="card wf-tasks-card"', 'class="card wf-tasks-card full-height"') + """
        }

        @if (activeTab() === 'timeline') {
          """ + timeline_card + """
        }
      </div>
"""

final_content = content[:start_idx] + new_html.strip() + '\n' + content[end_idx:]

with open('frontend/src/app/pages/workflows/workflows.html', 'w') as f:
    f.write(final_content)

print("Done")
