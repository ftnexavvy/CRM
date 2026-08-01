import re

with open('src/modules/workflow/services/workflow-auto-assign.service.ts', 'r') as f:
    content = f.read()

# 1. Add import
if 'generateCampaignSchedule' not in content:
    content = content.replace('import { ActivityService } from "../../activity/services/activity.service";', 
                              'import { ActivityService } from "../../activity/services/activity.service";\nimport { generateCampaignSchedule } from "../utils/campaign-scheduler.util";')

# 2. Add campaignStartDate and campaignEndDate in onboardClient
old_resolve_call = 'const dynamicTasks = this.resolveDynamicTasks(service, config, clientServicesToProcess);'
new_resolve_call = '''const campaignStartDate = workflow.startedAt || new Date();
      const campaignEndDate = new Date(campaignStartDate);
      campaignEndDate.setDate(campaignEndDate.getDate() + 30);

      const dynamicTasks = this.resolveDynamicTasks(service, config, clientServicesToProcess, campaignStartDate, campaignEndDate);'''

if old_resolve_call in content:
    content = content.replace(old_resolve_call, new_resolve_call)

# Also update the metadata call
old_metadata_call = 'templateCount: this.resolveDynamicTasks(cs.service, cs.configuration).length'
new_metadata_call = 'templateCount: this.resolveDynamicTasks(cs.service, cs.configuration, [], new Date(), new Date()).length'
content = content.replace(old_metadata_call, new_metadata_call)

# 3. Update resolveDynamicTasks signature
old_signature = 'private resolveDynamicTasks(service: any, config: any, allServicesConfig?: any[]): { title: string; departmentName?: string; type: any; dependsOnTitle?: string; isLocked?: boolean }[] {'
new_signature = 'private resolveDynamicTasks(service: any, config: any, allServicesConfig?: any[], campaignStartDate?: Date, campaignEndDate?: Date): { title: string; departmentName?: string; type: any; dependsOnTitle?: string; isLocked?: boolean; dueDate?: Date }[] {'
content = content.replace(old_signature, new_signature)

content = content.replace('const tasks: { title: string; departmentName?: string; type: any; dependsOnTitle?: string; isLocked?: boolean }[] = [];',
                          'const tasks: { title: string; departmentName?: string; type: any; dependsOnTitle?: string; isLocked?: boolean; dueDate?: Date }[] = [];')

# 4. Modify the loops in resolveDynamicTasks
def replace_loop(content, loop_regex, item_name, type_val, extra_logic):
    # This is a bit tricky, let's just replace the body manually since the function is well known
    pass

# For SMM staticPosts
smm_static = '''      const staticPosts = parseInt(config.staticPosts || "0");
      for (let i = 1; i <= staticPosts; i++) {
        const postTitle = `Design Post ${i}`;
        tasks.push({ title: postTitle, departmentName: "Graphics Designer", type: "GRAPHIC" });
        tasks.push({
          title: `Schedule & Publish Post ${i}`,
          departmentName: "Social Media Manager",
          type: "CONTENT",
          dependsOnTitle: postTitle,
          isLocked: true,
        });
      }'''

new_smm_static = '''      const staticPosts = parseInt(config.staticPosts || "0");
      const postDates = (campaignStartDate && campaignEndDate) ? generateCampaignSchedule(campaignStartDate, campaignEndDate, staticPosts) : [];
      for (let i = 1; i <= staticPosts; i++) {
        const dueDate = postDates[i - 1];
        const postTitle = `Design Post ${i}`;
        tasks.push({ title: postTitle, departmentName: "Graphics Designer", type: "GRAPHIC", dueDate });
        tasks.push({
          title: `Schedule & Publish Post ${i}`,
          departmentName: "Social Media Manager",
          type: "CONTENT",
          dependsOnTitle: postTitle,
          isLocked: true,
          dueDate
        });
      }'''
content = content.replace(smm_static, new_smm_static)

# For SMM carouselPosts
smm_carousel = '''      const carouselPosts = parseInt(config.carouselPosts || "0");
      for (let i = 1; i <= carouselPosts; i++) {
        const carouselTitle = `Design Carousel ${i}`;
        tasks.push({ title: carouselTitle, departmentName: "Graphics Designer", type: "GRAPHIC" });
        tasks.push({
          title: `Schedule & Publish Carousel ${i}`,
          departmentName: "Social Media Manager",
          type: "CONTENT",
          dependsOnTitle: carouselTitle,
          isLocked: true,
        });
      }'''
new_smm_carousel = '''      const carouselPosts = parseInt(config.carouselPosts || "0");
      const carouselDates = (campaignStartDate && campaignEndDate) ? generateCampaignSchedule(campaignStartDate, campaignEndDate, carouselPosts) : [];
      for (let i = 1; i <= carouselPosts; i++) {
        const dueDate = carouselDates[i - 1];
        const carouselTitle = `Design Carousel ${i}`;
        tasks.push({ title: carouselTitle, departmentName: "Graphics Designer", type: "GRAPHIC", dueDate });
        tasks.push({
          title: `Schedule & Publish Carousel ${i}`,
          departmentName: "Social Media Manager",
          type: "CONTENT",
          dependsOnTitle: carouselTitle,
          isLocked: true,
          dueDate
        });
      }'''
content = content.replace(smm_carousel, new_smm_carousel)

# For SMM stories
smm_stories = '''      const stories = parseInt(config.stories || "0");
      for (let i = 1; i <= stories; i++) {
        const storyTitle = `Design Story ${i}`;
        tasks.push({ title: storyTitle, departmentName: "Graphics Designer", type: "GRAPHIC" });
        tasks.push({
          title: `Schedule & Publish Story ${i}`,
          departmentName: "Social Media Manager",
          type: "CONTENT",
          dependsOnTitle: storyTitle,
          isLocked: true,
        });
      }'''
new_smm_stories = '''      const stories = parseInt(config.stories || "0");
      const storyDates = (campaignStartDate && campaignEndDate) ? generateCampaignSchedule(campaignStartDate, campaignEndDate, stories) : [];
      for (let i = 1; i <= stories; i++) {
        const dueDate = storyDates[i - 1];
        const storyTitle = `Design Story ${i}`;
        tasks.push({ title: storyTitle, departmentName: "Graphics Designer", type: "GRAPHIC", dueDate });
        tasks.push({
          title: `Schedule & Publish Story ${i}`,
          departmentName: "Social Media Manager",
          type: "CONTENT",
          dependsOnTitle: storyTitle,
          isLocked: true,
          dueDate
        });
      }'''
content = content.replace(smm_stories, new_smm_stories)

# For SMM reels
smm_reels = '''      const reels = parseInt(config.reels || "0");
      for (let i = 1; i <= reels; i++) {
        const reelTitle = `Edit Reel ${i}`;
        tasks.push({ title: reelTitle, departmentName: "Video Editor", type: "REEL" });
        tasks.push({
          title: `Schedule & Publish Reel ${i}`,
          departmentName: "Social Media Manager",
          type: "CONTENT",
          dependsOnTitle: reelTitle,
          isLocked: true,
        });
      }'''
new_smm_reels = '''      const reels = parseInt(config.reels || "0");
      const reelDates = (campaignStartDate && campaignEndDate) ? generateCampaignSchedule(campaignStartDate, campaignEndDate, reels) : [];
      for (let i = 1; i <= reels; i++) {
        const dueDate = reelDates[i - 1];
        const reelTitle = `Edit Reel ${i}`;
        tasks.push({ title: reelTitle, departmentName: "Video Editor", type: "REEL", dueDate });
        tasks.push({
          title: `Schedule & Publish Reel ${i}`,
          departmentName: "Social Media Manager",
          type: "CONTENT",
          dependsOnTitle: reelTitle,
          isLocked: true,
          dueDate
        });
      }'''
content = content.replace(smm_reels, new_smm_reels)

# For Graphics Designer SMM reel covers (line 397)
gd_smm_reels = '''          const reelCovers = parseInt(smmConfig?.reels || config.reelCovers || "0");
          for (let i = 1; i <= reelCovers; i++) {
            tasks.push({ title: `Design Reel Cover ${i}`, departmentName: "Graphics Designer", type: "GRAPHIC" });
          }'''
new_gd_smm_reels = '''          const reelCovers = parseInt(smmConfig?.reels || config.reelCovers || "0");
          const coverDates = (campaignStartDate && campaignEndDate) ? generateCampaignSchedule(campaignStartDate, campaignEndDate, reelCovers) : [];
          for (let i = 1; i <= reelCovers; i++) {
            const dueDate = coverDates[i - 1];
            tasks.push({ title: `Design Reel Cover ${i}`, departmentName: "Graphics Designer", type: "GRAPHIC", dueDate });
          }'''
content = content.replace(gd_smm_reels, new_gd_smm_reels)

# For Standalone Graphics
gd_standalone = '''      const posts = parseInt(config.staticPosts || "0");
      const carousels = parseInt(config.carouselPosts || "0");
      const stories = parseInt(config.stories || "0");
      const reelCovers = parseInt(config.reelCovers || "0");

      for (let i = 1; i <= posts; i++) tasks.push({ title: `Design Post ${i}`, departmentName: "Graphics Designer", type: "GRAPHIC" });
      for (let i = 1; i <= carousels; i++) tasks.push({ title: `Design Carousel ${i}`, departmentName: "Graphics Designer", type: "GRAPHIC" });
      for (let i = 1; i <= stories; i++) tasks.push({ title: `Design Story ${i}`, departmentName: "Graphics Designer", type: "GRAPHIC" });
      for (let i = 1; i <= reelCovers; i++) tasks.push({ title: `Design Reel Cover ${i}`, departmentName: "Graphics Designer", type: "GRAPHIC" });'''

new_gd_standalone = '''      const posts = parseInt(config.staticPosts || "0");
      const carousels = parseInt(config.carouselPosts || "0");
      const stories = parseInt(config.stories || "0");
      const reelCovers = parseInt(config.reelCovers || "0");

      const pDates = (campaignStartDate && campaignEndDate) ? generateCampaignSchedule(campaignStartDate, campaignEndDate, posts) : [];
      const cDates = (campaignStartDate && campaignEndDate) ? generateCampaignSchedule(campaignStartDate, campaignEndDate, carousels) : [];
      const sDates = (campaignStartDate && campaignEndDate) ? generateCampaignSchedule(campaignStartDate, campaignEndDate, stories) : [];
      const rDates = (campaignStartDate && campaignEndDate) ? generateCampaignSchedule(campaignStartDate, campaignEndDate, reelCovers) : [];

      for (let i = 1; i <= posts; i++) tasks.push({ title: `Design Post ${i}`, departmentName: "Graphics Designer", type: "GRAPHIC", dueDate: pDates[i - 1] });
      for (let i = 1; i <= carousels; i++) tasks.push({ title: `Design Carousel ${i}`, departmentName: "Graphics Designer", type: "GRAPHIC", dueDate: cDates[i - 1] });
      for (let i = 1; i <= stories; i++) tasks.push({ title: `Design Story ${i}`, departmentName: "Graphics Designer", type: "GRAPHIC", dueDate: sDates[i - 1] });
      for (let i = 1; i <= reelCovers; i++) tasks.push({ title: `Design Reel Cover ${i}`, departmentName: "Graphics Designer", type: "GRAPHIC", dueDate: rDates[i - 1] });'''
content = content.replace(gd_standalone, new_gd_standalone)

# For Standalone Video Editor
vd_standalone = '''      let reels = parseInt(config.reels || "0");
      let reelCovers = parseInt(config.reelCovers || "0");

      for (let i = 1; i <= reels; i++) {
        tasks.push({ title: `Edit Reel ${i}`, departmentName: "Video Editor", type: "REEL" });
      }
      for (let i = 1; i <= reelCovers; i++) {
        tasks.push({ title: `Design Reel Cover ${i}`, departmentName: "Graphics Designer", type: "GRAPHIC" });
      }'''

new_vd_standalone = '''      let reels = parseInt(config.reels || "0");
      let reelCovers = parseInt(config.reelCovers || "0");

      const rDates = (campaignStartDate && campaignEndDate) ? generateCampaignSchedule(campaignStartDate, campaignEndDate, reels) : [];
      const cDates = (campaignStartDate && campaignEndDate) ? generateCampaignSchedule(campaignStartDate, campaignEndDate, reelCovers) : [];

      for (let i = 1; i <= reels; i++) {
        tasks.push({ title: `Edit Reel ${i}`, departmentName: "Video Editor", type: "REEL", dueDate: rDates[i-1] });
      }
      for (let i = 1; i <= reelCovers; i++) {
        tasks.push({ title: `Design Reel Cover ${i}`, departmentName: "Graphics Designer", type: "GRAPHIC", dueDate: cDates[i-1] });
      }'''
content = content.replace(vd_standalone, new_vd_standalone)

# Finally, ensure that `dueDate` is actually persisted in `this.prisma.task.create`
create_task_old = '''            dependsOnTaskId,
            isLocked: taskDef.isLocked ?? false,
            status: ownerId ? WorkflowStatus.ASSIGNED : WorkflowStatus.PENDING,
            assignedToId: ownerId ?? undefined,'''
create_task_new = '''            dependsOnTaskId,
            isLocked: taskDef.isLocked ?? false,
            status: ownerId ? WorkflowStatus.ASSIGNED : WorkflowStatus.PENDING,
            assignedToId: ownerId ?? undefined,
            dueDate: taskDef.dueDate,'''
content = content.replace(create_task_old, create_task_new)

with open('src/modules/workflow/services/workflow-auto-assign.service.ts', 'w') as f:
    f.write(content)

print("Refactor Complete")
