import { App, Plugin, PluginSettingTab, Setting, normalizePath, Notice, TFile, WorkspaceLeaf, ItemView, ViewStateResult, MarkdownRenderer } from 'obsidian';

// 设置接口定义
interface AutoTaskPanelWithAISettings {
  dataFolderPath: string;
  promptsFolderPath: string;
  defaultPromptFilePath: string;
  logTemplateFilePath: string;
  logFilesFolderPath: string;
  taskFolderPath: string;
  tpvPanelEnabled: boolean;
  aiPanelEnabled: boolean;
  dailyLogEnabled: boolean;
  deepseekApiKey: string;
  refreshInterval: number; // 自动刷新间隔（毫秒），0表示从不自动更新
}

// 默认设置
const DEFAULT_SETTINGS: AutoTaskPanelWithAISettings = {
  dataFolderPath: '_Root/PluginSettings/AutoTaskPanel',
  promptsFolderPath: '_Root/PluginSettings/AutoTaskPanel/prompts',
  defaultPromptFilePath: '_Root/PluginSettings/AutoTaskPanel/prompts/DefaultPrompt.md',
  logTemplateFilePath: '_Root/PluginSettings/AutoTaskPanel/diarySettings.md',
  logFilesFolderPath: 'AutoTask 日志',
  taskFolderPath: 'AutoTask 任务',
  tpvPanelEnabled: true,
  aiPanelEnabled: true,
  dailyLogEnabled: true,
  deepseekApiKey: '',
  refreshInterval: 60000 // 默认1分钟
}

// 面板视图类型
const TASK_VIEWER_VIEW_TYPE = 'auto-task-viewer';
const AI_MESSAGE_VIEW_TYPE = 'ai-message-panel';

// 默认提示词内容
const DEFAULT_PROMPT_CONTENT = `
- 你是一个任务整合领域的专家，在正式回答中，请不要列举你做了什么，直接列举结果，这对你应该很容易。另外，格式上如果需要使用缩进以表示从属结构，请使用四个空格形成的缩进。
- 任务特指md文件格式中的任务列表格式（- [ ] 未完成任务与- [x] 已完成任务）。我需要你根据我给你的任务集和当前时间。帮我对未完成任务进行任务整合。
- 请准确地、不加扩展地、不臆想捏造地、以下列顺序地、以开始时间顺序精确贴合日期地列举以下信息并列举在独立的md三级标题下：
	1. 以任务列表格式列举今日需要执行的事项（保留源文本信息，但标签只需要保留时间相关标签，其中重复事项不需要多次列举，只需要保留重复规则标签与首个下次需要进行的时间。子任务如果没有指定时间标签则以其所属任务的执行时间为准。） 
	2. 以无序列表形式列举15天以内或未标注执行时间的待办事项，对标签的附加要求与第一点括号内一致（已在第一点内提及的事项此处不需要再次提及）
	3. 以无序列表形式简要描述项目内容（md标题形式记为项目）
`;

// 默认日志模板内容
const DEFAULT_LOG_TEMPLATE_CONTENT = "## {date}\n\n";

// 任务编辑器视图类


// 任务数据结构接口
interface Task {
  id: string;
  text: string;
  completed: boolean;
  parentId?: string;
  level: number;
  filePath: string;
  fileName: string;
}

// 任务阅览器视图类
export class TaskViewerView extends ItemView {
  plugin: AutoTaskPanelWithAI;
  private refreshIntervalId: number | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: AutoTaskPanelWithAI) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return TASK_VIEWER_VIEW_TYPE;
  }

  getDisplayText(): string {
    return '任务阅览器';
  }

  getIcon(): string {
    return 'circle-slash';
  }

  async onOpen() {
    const { containerEl } = this;
    containerEl.empty();
    
    const panel = containerEl.createEl('div', { cls: 'auto-task-viewer' });
    
    // 面板头部
    const header = panel.createEl('div', { cls: 'auto-task-viewer-header' });
    // 刷新按钮
    const refreshBtn = header.createEl('div', { cls: 'auto-task-viewer-refresh-btn' });
    refreshBtn.createEl('span', { text: '↻' });
    refreshBtn.addEventListener('click', async () => {
      // 添加颜色变化反馈
      const originalColor = refreshBtn.style.backgroundColor;
      refreshBtn.style.backgroundColor = '#96969649'; // 临时改变颜色
      
      // 添加0.5秒的通知反馈
      const notice = new Notice('任务阅览器已刷新', 500);
      
      await this.renderTasks();
      
      // 0.2秒后恢复原颜色
      setTimeout(() => {
        refreshBtn.style.backgroundColor = originalColor;
      }, 200);
    });
    
    // 面板内容
    const content = panel.createEl('div', { cls: 'auto-task-viewer-content' });
    
    // 初始渲染任务
    await this.renderTasks();
    
    // 根据用户设置设置自动刷新
    if (this.plugin.settings.refreshInterval > 0) {
      this.refreshIntervalId = window.setInterval(() => {
        this.renderTasks();
      }, this.plugin.settings.refreshInterval);
    }
  }

  // 更新任务状态
  private async updateTaskStatus(task: Task): Promise<void> {
    try {
      const file = this.app.vault.getFileByPath(task.filePath);
      if (!file) {
        throw new Error(`文件不存在: ${task.filePath}`);
      }
      
      const content = await this.app.vault.cachedRead(file);
      const lines = content.split('\n');
      
      // 查找任务行并更新状态
      for (let i = 0; i < lines.length; i++) {
        const originalLine = lines[i];
        const trimmedLine = originalLine.trim();
        
        // 检查是否是任务行（以- [ ] 或- [x] 开头）
        if ((trimmedLine.startsWith('- [ ] ') || trimmedLine.startsWith('- [x] ')) && 
            trimmedLine.substring(6).trim().startsWith(task.text)) {
          // 计算缩进
          const indent = originalLine.length - trimmedLine.length;
          
          // 确定新的状态标记（只更新状态标记，保留任务内容）
          const currentStatus = trimmedLine.startsWith('- [x] ') ? '- [x] ' : '- [ ] ';
          const newStatus = task.completed ? '- [x] ' : '- [ ] ';
          
          // 如果状态需要改变
          if (currentStatus !== newStatus) {
            // 只替换状态标记部分，保留其余内容不变
            lines[i] = ' '.repeat(indent) + newStatus + trimmedLine.substring(6);
          }
          break;
        }
      }
      
      await this.app.vault.modify(file, lines.join('\n'));
    } catch (error) {
      console.error('更新任务状态失败:', error);
      new Notice('更新任务状态失败', 2000);
    }
  }

  // 渲染任务列表
  private async renderTasks() {
    const content = this.containerEl.querySelector('.auto-task-viewer-content');
    if (!content) return;
    
    content.empty();
    
    try {
      // 获取所有任务
      let tasks = await this.getAllTasks();
      
      if (tasks.length === 0) {
        content.createEl('p', { text: '任务文件夹中没有找到任务。' });
        return;
      }
      
      // 按父任务组织任务，将子任务与父任务组合
      const parentTasks = tasks.filter(task => !task.parentId);
      
      for (const parentTask of parentTasks) {
        // 创建任务卡片容器
        const taskCard = content.createEl('div', {
          cls: `task-card ${parentTask.completed ? 'task-completed' : 'task-pending'}`
        });
        
        // 创建主内容区域和右侧按钮区域
        const contentContainer = taskCard.createEl('div', { cls: 'task-content' });
        const buttonsContainer = taskCard.createEl('div', { cls: 'task-buttons' });
        
        // 标题容器
        const titleContainer = contentContainer.createEl('div', { cls: 'title-container' });
        
        // 添加任务卡片点击事件，实现跳转到任务所在行
        taskCard.addEventListener('click', async () => {
          try {
            // 打开文件
            const file = this.app.vault.getFileByPath(parentTask.filePath);
            if (!file) {
              throw new Error(`文件不存在: ${parentTask.filePath}`);
            }
            
            // 查找任务在文件中的行号
            const content = await this.app.vault.cachedRead(file);
            const lines = content.split('\n');
            let taskLineNumber = 0;
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if ((line.startsWith('- [ ] ') || line.startsWith('- [x] ')) && 
                  line.substring(6).trim().startsWith(parentTask.text)) {
                taskLineNumber = i + 1; // Obsidian使用1-indexed
                break;
              }
            }
            
            // 打开文件并滚动到任务行
            await this.app.workspace.getLeaf(true).openFile(file);
            
            // 使用setTimeout确保文件已打开
            setTimeout(() => {
              const editor = this.app.workspace.activeEditor?.editor;
              if (editor) {
                // 滚动到指定行
                editor.setCursor({ line: taskLineNumber - 1, ch: 0 });
                editor.scrollIntoView({ from: { line: taskLineNumber - 1, ch: 0 }, to: { line: taskLineNumber - 1, ch: 0 } }, true);
              }
            }, 300);
            
          } catch (error) {
            console.error('跳转到任务失败:', error);
            new Notice('跳转到任务失败', 2000);
          }
        });
        
        // 父任务内容
        const parentTaskText = titleContainer.createEl('div', { cls: 'parent-task-text' });
        
        // 使用Obsidian的MarkdownRenderer类正确渲染任务内容
        await MarkdownRenderer.renderMarkdown(parentTask.text, parentTaskText, '', this);
        
        // 添加鼠标悬停样式提示
        taskCard.style.cursor = 'pointer';
        
        // 查找并渲染子任务
        const childTasks = tasks.filter(task => task.parentId === parentTask.id);
        if (childTasks.length > 0) {
          const childTasksContainer = contentContainer.createEl('div', { cls: 'child-tasks' });
          
          for (const childTask of childTasks) {
              const childTaskElement = childTasksContainer.createEl('div', {
                cls: `child-task ${childTask.completed ? 'task-completed' : 'task-pending'}`
              });
              
              // 添加子任务点击事件，实现跳转到任务所在行
              childTaskElement.addEventListener('click', async (e) => {
                e.stopPropagation(); // 防止触发父任务的点击事件
                try {
                  // 打开文件
                  const file = this.app.vault.getFileByPath(childTask.filePath);
                  if (!file) {
                    throw new Error(`文件不存在: ${childTask.filePath}`);
                  }
                  
                  // 查找任务在文件中的行号
                  const content = await this.app.vault.cachedRead(file);
                  const lines = content.split('\n');
                  let taskLineNumber = 0;
                  
                  for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if ((line.startsWith('- [ ] ') || line.startsWith('- [x] ')) && 
                        line.substring(6).trim().startsWith(childTask.text)) {
                      taskLineNumber = i + 1; // Obsidian使用1-indexed
                      break;
                    }
                  }
                  
                  // 打开文件并滚动到任务行
                  await this.app.workspace.getLeaf(true).openFile(file);
                  
                  // 使用setTimeout确保文件已打开
                  setTimeout(() => {
                    const editor = this.app.workspace.activeEditor?.editor;
                    if (editor) {
                      // 滚动到指定行
                      editor.setCursor({ line: taskLineNumber - 1, ch: 0 });
                      editor.scrollIntoView({ from: { line: taskLineNumber - 1, ch: 0 }, to: { line: taskLineNumber - 1, ch: 0 } }, true);
                    }
                  }, 300);
                  
                } catch (error) {
                  console.error('跳转到子任务失败:', error);
                  new Notice('跳转到子任务失败', 2000);
                }
              });
              
              // 创建子任务文本容器
              const childTaskText = childTaskElement.createEl('span', { cls: 'child-task-text' });
              // 使用Obsidian的MarkdownRenderer类正确渲染子任务内容
              await MarkdownRenderer.renderMarkdown(childTask.text, childTaskText, '', this);
              
              // 添加鼠标悬停样式提示
              childTaskElement.style.cursor = 'pointer';
            }
        }
      }
        
    } catch (error) {
      console.error('渲染任务失败:', error);
      content.createEl('p', { text: '加载任务失败，请检查任务文件夹设置。' });
    }
  }

  // 获取所有任务文件中的任务
  private async getAllTasks(): Promise<Task[]> {
    const tasks: Task[] = [];
    const taskFolder = this.plugin.settings.taskFolderPath || 'AutoTask 任务';
    
    // 获取任务文件夹中的所有Markdown文件
    const files = this.app.vault.getFiles().filter(file => 
      file.extension === 'md' && 
      file.path.startsWith(`${taskFolder}/`)
    );
    
    // 解析每个文件中的任务
    for (const file of files) {
      const content = await this.app.vault.cachedRead(file);
      const fileTasks = this.parseTasksFromContent(content, file.path, file.name);
      tasks.push(...fileTasks);
    }
    
    return tasks;
  }

  // 从文件内容中解析任务
  private parseTasksFromContent(content: string, filePath: string, fileName: string): Task[] {
    const tasks: Task[] = [];
    const lines = content.split('\n');
    const taskLines: { text: string; line: number; }[] = [];
    
    // 首先收集所有任务行
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('- [ ] ') || line.startsWith('- [x] ')) {
        taskLines.push({ text: line, line: i });
      }
    }
    
    // 解析每个任务
    taskLines.forEach((taskLine, index) => {
      const line = taskLine.text;
      const completed = line.startsWith('- [x] ');
      const taskText = line.substring(6).trim();
      
      // 计算缩进层级
      const indent = lines[taskLine.line].length - line.length;
      const level = Math.floor(indent / 2) + 1;
      
      // 寻找父任务
      let parentId: string | undefined;
      if (level > 1) {
        // 查找同一文件中，当前任务前一个层级比当前任务小1的任务
        for (let i = index - 1; i >= 0; i--) {
          const prevLine = lines[taskLines[i].line];
          const prevIndent = prevLine.length - prevLine.trim().length;
          const prevLevel = Math.floor(prevIndent / 2) + 1;
          
          if (prevLevel === level - 1) {
            parentId = `task-${filePath}-${i}`;
            break;
          }
        }
      }
      
      tasks.push({
        id: `task-${filePath}-${index}`,
        text: taskText,
        completed,
        parentId,
        level,
        filePath,
        fileName
      });
    });
    
    return tasks;
  }

  async onClose() {
    // 清除自动刷新定时器
    if (this.refreshIntervalId !== null) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }
  
  // 当设置更改时更新自动刷新间隔
  updateRefreshInterval() {
    // 清除现有的定时器
    if (this.refreshIntervalId !== null) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
    
    // 根据新设置创建定时器
    if (this.plugin.settings.refreshInterval > 0) {
      this.refreshIntervalId = window.setInterval(() => {
        this.renderTasks();
      }, this.plugin.settings.refreshInterval);
    }
  }
}

// AI消息面板视图类
export class AIMessagePanel extends ItemView {
  plugin: AutoTaskPanelWithAI;

  constructor(leaf: WorkspaceLeaf, plugin: AutoTaskPanelWithAI) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return AI_MESSAGE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'AI消息面板';
  }

  getIcon(): string {
    return 'bot-message-square';
  }

  async onOpen() {
    const { containerEl } = this;
    containerEl.empty();
    
    const panel = containerEl.createEl('div', { cls: 'ai-message-panel' });

    // 面板内容
    const content = panel.createEl('div', { cls: 'ai-message-panel-content' });
    content.createEl('p', { text: 'AI消息面板 - 用于显示和管理AI相关消息。' });
    content.createEl('p', { text: '此面板将在未来版本中添加更多AI交互功能。' });
  }

  async onClose() {
    // 清理资源
  }
}

export default class AutoTaskPanelWithAI extends Plugin {
  settings: AutoTaskPanelWithAISettings = DEFAULT_SETTINGS;

  async onload() {
    // 加载设置
    await this.loadSettings();
    
    // 样式将通过manifest.json中的设置自动加载
    
    // 注册视图
    this.registerView(TASK_VIEWER_VIEW_TYPE, (leaf) => new TaskViewerView(leaf, this));
    this.registerView(AI_MESSAGE_VIEW_TYPE, (leaf) => new AIMessagePanel(leaf, this));
    
    // 添加命令 - 打开任务阅览器
    this.addCommand({
      id: 'open-task-viewer',
      name: '打开任务阅览器',
      callback: () => this.ensurePanelVisible(TASK_VIEWER_VIEW_TYPE),
      hotkeys: [
        { modifiers: ['Ctrl', 'Alt', 'Shift'], key: 't' }
      ]
    });
    
    // 添加命令 - 打开AI消息面板
    this.addCommand({
      id: 'open-ai-message-panel',
      name: '打开AI消息面板',
      callback: () => this.ensurePanelVisible(AI_MESSAGE_VIEW_TYPE),
      hotkeys: [
        { modifiers: ['Ctrl', 'Alt'], key: 'i' }
      ]
    });
    
    // 添加命令 - 创建每日日志
    this.addCommand({
      id: 'create-daily-log',
      name: '创建每日日志',
      callback: async () => {
        await this.createDailyLogFile();
      },
      hotkeys: [
        { modifiers: ['Ctrl', 'Alt'], key: 'd' }
      ]
    });

    // 添加命令 - 在任务文件夹中创建文件
    this.addCommand({
      id: 'create-task-file',
      name: '创建新任务集',
      callback: async () => {
        await this.createTaskFile();
      },
      hotkeys: [
        { modifiers: ['Ctrl', 'Alt'], key: 'n' }
      ]
    });
    

        
    // 添加功能区按钮 - 创建新任务文件
    this.addRibbonIcon('album', '创建新任务集', async () => {
      await this.createTaskFile();
    });
    // 添加功能区按钮 - 打开任务阅览器
    this.addRibbonIcon('circle-slash', '打开任务阅览器', () => {
      this.ensurePanelVisible(TASK_VIEWER_VIEW_TYPE);
    });
    // 添加功能区按钮 - 打开AI消息面板
    this.addRibbonIcon('bot-message-square', '打开AI消息面板', () => {
      this.ensurePanelVisible(AI_MESSAGE_VIEW_TYPE);
    });

    
    // 添加多选项卡设置界面
    this.addSettingTab(new AutoTaskPanelWithAISettingsTab(this.app, this));

    // 当Obsidian布局完全准备好后再创建文件，确保Obsidian能正确读取文件
    this.app.workspace.onLayoutReady(async () => {
      await this.ensureFoldersAndFilesExist();
      
      // 如果启用了每日日志功能，自动创建当天的日志文件
      if (this.settings.dailyLogEnabled) {
        await this.createDailyLogFile();
      }
      
      // 如果启用了面板，默认打开它们
      if (this.settings.tpvPanelEnabled) {
        await this.ensurePanelVisible(TASK_VIEWER_VIEW_TYPE);
      }
      // 默认在右侧边栏打开AI消息面板
      if (this.settings.aiPanelEnabled) {
        // 首先检查整个工作区是否已经存在AI消息面板
        const existingLeaves = this.app.workspace.getLeavesOfType(AI_MESSAGE_VIEW_TYPE);
        if (existingLeaves.length > 0) {
          // 如果已存在，确保它可见
          this.app.workspace.revealLeaf(existingLeaves[0]);
        } else {
          // 获取右侧边栏
          const rightLeaf = this.app.workspace.getRightLeaf(false);
          if (rightLeaf) {
            await rightLeaf.setViewState({
              type: AI_MESSAGE_VIEW_TYPE,
              active: false
            });
            // 确保右侧边栏展开
            this.app.workspace.revealLeaf(rightLeaf);
          } else {
            // 如果没有右侧边栏，创建一个并打开AI消息面板
            await this.ensurePanelVisible(AI_MESSAGE_VIEW_TYPE);
          }
        }
      }
    });

    this.log('插件已加载');
  }

  async onunload() {
    this.log('插件已卸载');
  }

  // 加载设置
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  // 保存设置
  async saveSettings() {
    await this.saveData(this.settings);
  }

  // 确保必要的文件夹和文件存在
  async ensureFoldersAndFilesExist() {
    try {
      let createdItems = [];
      
      // 创建任务文件夹
      const taskFolder = normalizePath(this.settings.taskFolderPath);
      const taskFolderExists = await this.app.vault.adapter.exists(taskFolder);
      if (!taskFolderExists) {
        await this.app.vault.createFolder(taskFolder).catch(() => {});
        if (await this.app.vault.adapter.exists(taskFolder)) {
          createdItems.push(`任务文件夹: ${taskFolder}`);
        }
      }
      
      // 创建数据存储文件夹
      const dataFolder = normalizePath(this.settings.dataFolderPath);
      const dataFolderExists = await this.app.vault.adapter.exists(dataFolder);
      if (!dataFolderExists) {
        await this.app.vault.createFolder(dataFolder).catch(() => {});
        if (await this.app.vault.adapter.exists(dataFolder)) {
          createdItems.push(`数据文件夹: ${dataFolder}`);
        }
      }

      // 创建提示词文件夹
      const promptsFolder = normalizePath(this.settings.promptsFolderPath);
      const promptsFolderExists = await this.app.vault.adapter.exists(promptsFolder);
      if (!promptsFolderExists) {
        await this.app.vault.createFolder(promptsFolder).catch(() => {});
        if (await this.app.vault.adapter.exists(promptsFolder)) {
          createdItems.push(`提示词文件夹: ${promptsFolder}`);
        }
      }

      // 创建默认提示词文件
      const defaultPromptFile = normalizePath(this.settings.defaultPromptFilePath);
      const fileExists = await this.app.vault.adapter.exists(defaultPromptFile);
      
      if (!fileExists) {
        await this.app.vault.create(defaultPromptFile, DEFAULT_PROMPT_CONTENT);
        this.log('已创建默认提示词文件');
        createdItems.push(`默认提示词文件: ${defaultPromptFile}`);
      }
      
      // 创建日志模板文件
      const logTemplateFile = normalizePath(this.settings.logTemplateFilePath);
      const logTemplateExists = await this.app.vault.adapter.exists(logTemplateFile);
      
      if (!logTemplateExists) {
        // 确保日志模板文件的父文件夹存在
        const logTemplateDir = logTemplateFile.substring(0, logTemplateFile.lastIndexOf('/'));
        if (logTemplateDir && logTemplateDir !== logTemplateFile) {
          const dirExists = await this.app.vault.adapter.exists(logTemplateDir);
          if (!dirExists) {
            await this.app.vault.createFolder(logTemplateDir).catch(() => {});
          }
        }
        
        await this.app.vault.create(logTemplateFile, DEFAULT_LOG_TEMPLATE_CONTENT);
        this.log('已创建日志模板文件');
        createdItems.push(`日志模板文件: ${logTemplateFile}`);
      }

      // 如果有新创建的项目，显示提示信息
      if (createdItems.length > 0) {
        new Notice(`已创建以下项目:\n${createdItems.join('\n')}`, 2000); // 2秒后消失
      }

      this.log('文件夹和文件检查完成');
    } catch (error) {
      this.logError('创建文件夹或文件时出错:', error);
      new Notice('创建必要的文件夹或文件时出错');
    }
  }

  // 确保面板可见
  private async ensurePanelVisible(viewType: string): Promise<void> {
    // 检查是否已经有该类型的视图
    let leaf: WorkspaceLeaf | null = null;
    for (const l of this.app.workspace.getLeavesOfType(viewType)) {
      leaf = l;
      break;
    }

    // 如果没有找到现有视图，创建新的叶子
    if (!leaf) {
      if (viewType === AI_MESSAGE_VIEW_TYPE) {
        // 确保AI消息面板在右侧边栏打开
        leaf = this.app.workspace.getRightLeaf(false);
        if (!leaf) {
          // 强制创建右侧边栏
          leaf = this.app.workspace.getRightLeaf(true);
        }
      } else {
        leaf = this.app.workspace.getLeaf();
      }
      
      // 确保leaf不为null后再调用方法
      if (leaf) {
        await leaf.setViewState({
          type: viewType,
        });
      }
    }

    // 确保叶子在窗格中可见（添加null检查）
    if (leaf) {
      this.app.workspace.revealLeaf(leaf);
      
      // 更新设置
      if (viewType === TASK_VIEWER_VIEW_TYPE) {
        this.settings.tpvPanelEnabled = true;
      } else if (viewType === AI_MESSAGE_VIEW_TYPE) {
        this.settings.aiPanelEnabled = true;
      }
      await this.saveSettings();
    }
  }

  // 日志方法
  private log(...args: any[]) {
    console.log('[Auto Task Panel With AI]', ...args);
  }

  private logError(...args: any[]) {
    console.error('[Auto Task Panel With AI]', ...args);
  }
  
  // 创建每日日志文件
  private async createDailyLogFile(): Promise<void> {
    try {
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      
      // 格式化日期部分
      const yy = year.slice(2);
      const yyMm = `${yy}.${month}`;
      const yyMmDd = `${yy}.${month}.${day}`;
      
      // 创建文件夹路径
      const baseFolder = this.settings.logFilesFolderPath || 'AutoTask 日志';
      const yearFolder = normalizePath(`${baseFolder}/${year}`);
      const monthFolder = normalizePath(`${yearFolder}/${yyMm}`);
      const filePath = normalizePath(`${monthFolder}/${yyMmDd}.md`);
      
      // 创建必要的文件夹
      await this.app.vault.createFolder(yearFolder).catch(() => {}); // 忽略已存在的错误
      await this.app.vault.createFolder(monthFolder).catch(() => {}); // 忽略已存在的错误
      
      // 检查文件是否已存在
      const fileExists = await this.app.vault.adapter.exists(filePath);
      if (fileExists) {
          return;
      }
      
      // 从日志模板文件读取内容
      let templateContent = DEFAULT_LOG_TEMPLATE_CONTENT; // 默认使用默认模板
      
      try {
        const logTemplateFile = this.app.metadataCache.getFirstLinkpathDest(
          this.settings.logTemplateFilePath, 
          ''
        );
        
        if (logTemplateFile) {
          templateContent = await this.app.vault.read(logTemplateFile);
        }
      } catch (templateError) {
        this.logError('读取日志模板文件失败，使用默认模板:', templateError);
      }
      
      // 准备日期格式
      const fullDate = `${year}.${month}.${day}`;
      
      // 将{date}标签替换为YYYY.MM.DD格式的当前日期
      const finalLogContent = templateContent.replace(/{date}/g, fullDate);
      
      // 创建文件
      await this.app.vault.create(filePath, finalLogContent);
      
      // 获取创建的文件并显示提示
      const newFile = this.app.metadataCache.getFirstLinkpathDest(filePath, '');
      if (newFile) {
        // 仅在自动创建日志且日志不存在时显示创建提示
        new Notice(`已创建今日日志: ${yyMmDd}.md`);
      }
    } catch (error) {
      this.logError('创建每日日志文件失败:', error);
      new Notice('创建每日日志文件失败，请检查权限设置');
    }
  }

  private async createTaskFile(): Promise<void> {
    try {
      const now = new Date();
      const year = now.getFullYear().toString();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      
      // 生成基于时间戳的唯一文件名
      const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
      const fileName = `任务_${timestamp}.md`;
      
      // 获取任务文件夹路径
      const taskFolder = this.settings.taskFolderPath || 'AutoTask 任务';
      const filePath = normalizePath(`${taskFolder}/${fileName}`);
      
      // 确保任务文件夹存在
      await this.app.vault.createFolder(taskFolder).catch(() => {}); // 忽略已存在的错误
      
      // 检查文件是否已存在（理论上不太可能，但以防万一）
      const fileExists = await this.app.vault.adapter.exists(filePath);
      if (fileExists) {
        new Notice('文件已存在，请稍后再试');
        return;
      }
      
      // 创建文件
      await this.app.vault.create(filePath, "");
      
      // 获取创建的文件并显示提示
      const newFile = this.app.metadataCache.getFirstLinkpathDest(filePath, '');
      if (newFile) {
        // 打开新创建的文件并确保获得焦点
        const leaf = this.app.workspace.getLeaf();
        await leaf.openFile(newFile, { active: true });
        // 确保新文件窗格获得焦点
        this.app.workspace.setActiveLeaf(leaf);
        new Notice(`已在任务文件夹中创建文件: ${fileName}`);
      }
    } catch (error) {
      this.logError('在任务文件夹中创建文件失败:', error);
      new Notice('创建任务文件失败，请检查权限设置');
    }
  }
}

// 设置选项卡类 - 多选项卡设置界面
class AutoTaskPanelWithAISettingsTab extends PluginSettingTab {
  plugin: AutoTaskPanelWithAI;
  activeTab: string = 'fileSettings'; // 默认激活文件设置选项卡

  constructor(app: App, plugin: AutoTaskPanelWithAI) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h2', { text: 'Auto Task Panel With AI 设置' });
    
    // 创建选项卡导航
    this.createTabs(containerEl);
    
    // 根据当前活动选项卡显示内容
    const contentContainer = containerEl.createEl('div');
    contentContainer.style.paddingTop = '20px';
    
    if (this.activeTab === 'fileSettings') {
      this.displayFileSettings(contentContainer);
    } else if (this.activeTab === 'autoStart') {
      this.displayAutoStartTab(contentContainer);
    } else if (this.activeTab === 'aiFeatures') {
      this.displayAIFeaturesTab(contentContainer);
    } else if (this.activeTab === 'about') {
      this.displayAboutTab(contentContainer);
    }
  }

  // 创建选项卡导航
  private createTabs(container: HTMLElement): void {
    const tabContainer = container.createEl('div');
    tabContainer.style.display = 'flex';
    tabContainer.style.borderBottom = '1px solid var(--background-modifier-border)';
    
    // 文件设置选项卡
    const fileTab = tabContainer.createEl('button', {
      text: '文件设置',
      cls: ['clickable-icon']
    });
    fileTab.style.padding = '8px 16px';
    fileTab.style.border = 'none';
    fileTab.style.background = 'none';
    fileTab.style.cursor = 'pointer';
    fileTab.style.fontWeight = this.activeTab === 'fileSettings' ? 'bold' : 'normal';
    fileTab.style.borderBottom = this.activeTab === 'fileSettings' ? '2px solid var(--interactive-accent)' : 'none';
    fileTab.addEventListener('click', () => {
      this.activeTab = 'fileSettings';
      this.display();
    });
    
    // 自动启动选项卡
    const autoStartTab = tabContainer.createEl('button', {
      text: '自动启动',
      cls: ['clickable-icon']
    });
    autoStartTab.style.padding = '8px 16px';
    autoStartTab.style.border = 'none';
    autoStartTab.style.background = 'none';
    autoStartTab.style.cursor = 'pointer';
    autoStartTab.style.fontWeight = this.activeTab === 'autoStart' ? 'bold' : 'normal';
    autoStartTab.style.borderBottom = this.activeTab === 'autoStart' ? '2px solid var(--interactive-accent)' : 'none';
    autoStartTab.addEventListener('click', () => {
      this.activeTab = 'autoStart';
      this.display();
    });
    
    // AI功能选项卡
    const aiFeaturesTab = tabContainer.createEl('button', {
      text: 'AI功能',
      cls: ['clickable-icon']
    });
    aiFeaturesTab.style.padding = '8px 16px';
    aiFeaturesTab.style.border = 'none';
    aiFeaturesTab.style.background = 'none';
    aiFeaturesTab.style.cursor = 'pointer';
    aiFeaturesTab.style.fontWeight = this.activeTab === 'aiFeatures' ? 'bold' : 'normal';
    aiFeaturesTab.style.borderBottom = this.activeTab === 'aiFeatures' ? '2px solid var(--interactive-accent)' : 'none';
    aiFeaturesTab.addEventListener('click', () => {
      this.activeTab = 'aiFeatures';
      this.display();
    });
    
    // 关于选项卡
    const aboutTab = tabContainer.createEl('button', {
      text: '关于',
      cls: ['clickable-icon']
    });
    aboutTab.style.padding = '8px 16px';
    aboutTab.style.border = 'none';
    aboutTab.style.background = 'none';
    aboutTab.style.cursor = 'pointer';
    aboutTab.style.fontWeight = this.activeTab === 'about' ? 'bold' : 'normal';
    aboutTab.style.borderBottom = this.activeTab === 'about' ? '2px solid var(--interactive-accent)' : 'none';
    aboutTab.addEventListener('click', () => {
      this.activeTab = 'about';
      this.display();
    });
  }
  
  // 显示自动启动选项卡
  private displayAutoStartTab(container: HTMLElement): void {

    // 面板启用设置
    
    new Setting(container)
      .setName('自动打开任务阅览器')
      .setDesc('在插件启动时自动打开任务阅览器')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.tpvPanelEnabled)
        .onChange(async (value) => {
          this.plugin.settings.tpvPanelEnabled = value;
          await this.plugin.saveSettings();
        }));
    
    // 任务列表自动刷新设置
    new Setting(container)
      .setName('任务阅览器自动刷新频率')
      .setDesc('设置任务阅览器自动刷新间隔时间')
      .addDropdown(dropdown => dropdown
        .addOption('0', '从不自动更新')
        .addOption('1000', '1秒')
        .addOption('5000', '5秒')
        .addOption('60000', '1分钟')
        .addOption('300000', '5分钟')
        .addOption('900000', '15分钟')
        .addOption('1800000', '30分钟')
        .setValue(this.plugin.settings.refreshInterval.toString())
        .onChange(async (value) => {
          this.plugin.settings.refreshInterval = parseInt(value);
          await this.plugin.saveSettings();
        }));
    
    // 添加分隔线
    container.createEl('div', { cls: 'setting-item-divider' });
    
    // 每日日志功能设置
    new Setting(container)
      .setName('自动创建每日日志')
      .setDesc('在库打开时自动创建当天日志文件。')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.dailyLogEnabled)
        .onChange(async (value) => {
          this.plugin.settings.dailyLogEnabled = value;
          await this.plugin.saveSettings();
        }));
    
    // AI消息面板设置
    new Setting(container)
      .setName('默认启用AI消息面板')
      .setDesc('启用后，插件启动时会在右侧边栏自动打开AI消息面板')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.aiPanelEnabled)
        .onChange(async (value) => {
          this.plugin.settings.aiPanelEnabled = value;
          await this.plugin.saveSettings();
        }));
  }

  // 显示文件设置选项卡
  private displayFileSettings(container: HTMLElement): void {

    // 数据文件夹路径设置
    new Setting(container)
      .setName('数据存储文件夹路径')
      .setDesc('插件存储数据的文件夹路径')
      .addButton(button => {
        const btn = button
          .setTooltip('重置为默认路径')
          .setIcon('refresh-cw')
          .onClick(async () => {
            this.plugin.settings.dataFolderPath = DEFAULT_SETTINGS.dataFolderPath;
            await this.plugin.saveSettings();
            this.display(); // 刷新设置界面以显示更改
          });
        // 设置tooltip延迟时间为100毫秒
        if (btn.buttonEl) {
          (btn.buttonEl as any).tooltipOptions = { delay: 100 };
        }
        return btn;
      })
      .addText(text => {
        text
          .setValue(this.plugin.settings.dataFolderPath)
          .onChange(async (value) => {
            this.plugin.settings.dataFolderPath = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '500px'; // 增加输入框宽度
        return text;
      })

    // 提示词文件夹路径设置
    new Setting(container)
      .setName('提示词文件夹路径')
      .setDesc('存储提示词文件的文件夹路径')
      .addButton(button => {
        const btn = button
          .setTooltip('重置为默认路径')
          .setIcon('refresh-cw')
          .onClick(async () => {
            this.plugin.settings.promptsFolderPath = DEFAULT_SETTINGS.promptsFolderPath;
            await this.plugin.saveSettings();
            this.display(); // 刷新设置界面以显示更改
          });
        // 设置tooltip延迟时间为100毫秒
        if (btn.buttonEl) {
          (btn.buttonEl as any).tooltipOptions = { delay: 100 };
        }
        return btn;
      })
      .addText(text => {
        text
          .setValue(this.plugin.settings.promptsFolderPath)
          .onChange(async (value) => {
            this.plugin.settings.logTemplateFilePath = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '500px'; // 增加输入框宽度
        return text;
      });
      
    // 日志模板文件路径设置
    new Setting(container)
      .setName('日志模板文件路径')
      .setDesc('用于日志记录的模板文件路径')
      .addButton(button => {
        const btn = button
          .setTooltip('重置为默认路径')
          .setIcon('refresh-cw')
          .onClick(async () => {
            this.plugin.settings.logTemplateFilePath = DEFAULT_SETTINGS.logTemplateFilePath;
            await this.plugin.saveSettings();
            this.display(); // 刷新设置界面以显示更改
          });
        // 设置tooltip延迟时间为100毫秒
        if (btn.buttonEl) {
          (btn.buttonEl as any).tooltipOptions = { delay: 100 };
        }
        return btn;
      })
      .addText(text => {
        text
          .setValue(this.plugin.settings.logTemplateFilePath)
          .onChange(async (value) => {
            this.plugin.settings.logTemplateFilePath = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '500px'; // 增加输入框宽度
        return text;
      })

    // 日志文件存放路径设置
    new Setting(container)
      .setName('日志文件路径')
      .setDesc('每日日志文件的存储位置')
      .addButton(button => {
        const btn = button
          .setTooltip('重置为默认路径')
          .setIcon('refresh-cw')
          .onClick(async () => {
            this.plugin.settings.logFilesFolderPath = DEFAULT_SETTINGS.logFilesFolderPath;
            await this.plugin.saveSettings();
            this.display(); // 刷新设置界面以显示更改
          });
        // 设置tooltip延迟时间为100毫秒
        if (btn.buttonEl) {
          (btn.buttonEl as any).tooltipOptions = { delay: 100 };
        }
        return btn;
      })
      .addText(text => {
        text
          .setValue(this.plugin.settings.logFilesFolderPath)
          .onChange(async (value) => {
            this.plugin.settings.logFilesFolderPath = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '500px'; // 增加输入框宽度
        return text;
      })
      
    // 任务文件夹路径设置
    new Setting(container)
      .setName('任务文件夹路径')
      .setDesc('存储任务文件的文件夹路径')
      .addButton(button => {
        const btn = button
          .setTooltip('重置为默认路径')
          .setIcon('refresh-cw')
          .onClick(async () => {
            this.plugin.settings.taskFolderPath = DEFAULT_SETTINGS.taskFolderPath;
            await this.plugin.saveSettings();
            this.display(); // 刷新设置界面以显示更改
          });
        // 设置tooltip延迟时间为100毫秒
        if (btn.buttonEl) {
          (btn.buttonEl as any).tooltipOptions = { delay: 100 };
        }
        return btn;
      })
      .addText(text => {
        text
          .setValue(this.plugin.settings.taskFolderPath)
          .onChange(async (value) => {
            this.plugin.settings.taskFolderPath = value;
            await this.plugin.saveSettings();
            // 当用户更改任务文件夹路径后，立即创建新的文件夹
            const newTaskFolder = normalizePath(value);
            const folderExists = await this.plugin.app.vault.adapter.exists(newTaskFolder);
            if (!folderExists) {
              await this.plugin.app.vault.createFolder(newTaskFolder).catch(() => {});
              new Notice(`已创建新的任务文件夹: ${newTaskFolder}`);
            }
          });
        text.inputEl.style.width = '500px'; // 增加输入框宽度
        return text;
      })

    // 默认提示词文件路径设置
    new Setting(container)
      .setName('默认提示词文件路径')
      .setDesc('默认提示词文件的路径')
      .addButton(button => {
        const btn = button
          .setTooltip('重置为默认路径')
          .setIcon('refresh-cw')
          .onClick(async () => {
            this.plugin.settings.defaultPromptFilePath = DEFAULT_SETTINGS.defaultPromptFilePath;
            await this.plugin.saveSettings();
            this.display(); // 刷新设置界面以显示更改
          });
        // 设置tooltip延迟时间为100毫秒
        if (btn.buttonEl) {
          (btn.buttonEl as any).tooltipOptions = { delay: 100 };
        }
        return btn;
      })
      .addText(text => {
        text
          .setValue(this.plugin.settings.defaultPromptFilePath)
          .onChange(async (value) => {
            this.plugin.settings.defaultPromptFilePath = value;
            await this.plugin.saveSettings();
          });
        text.inputEl.style.width = '500px'; // 增加输入框宽度
        return text;
      })

    // 重新创建文件夹和文件的按钮
    new Setting(container)
      .setName('重新创建文件夹和文件')
      .setDesc('根据当前设置重新创建必要的文件夹和文件')
      .addButton(button => button
        .setButtonText('创建')
        .onClick(async () => {
          await this.plugin.ensureFoldersAndFilesExist();
        }));
  }

  // 显示AI功能选项卡
  private displayAIFeaturesTab(container: HTMLElement): void {
    
    // DeepSeek API Key设置
    const apiKeySetting = new Setting(container)
      .setName('DeepSeek API Key')
      .setDesc('用于AI功能的DeepSeek API密钥，将使用deepseek-reasoner模型')
      .addText(text => {
        text
          .setPlaceholder('请输入您的DeepSeek API Key')
          .setValue(this.plugin.settings.deepseekApiKey)
          .onChange(async (value) => {
            this.plugin.settings.deepseekApiKey = value;
            await this.plugin.saveSettings();
          });
        // 设置输入框宽度为原先的1.75倍
        if (text.inputEl) {
          text.inputEl.style.width = '175%';
        }
        return text;
      });
    
    // 设置父容器样式以适应更长的输入框
    apiKeySetting.settingEl.style.display = 'flex';
    apiKeySetting.settingEl.style.alignItems = 'center';
    
  }
  
  // 显示关于选项卡
  private displayAboutTab(container: HTMLElement): void {
    
    container.createEl('p', { 
      text: '这是一个为Obsidian提供AI辅助任务管理的插件。'
    });
    
    container.createEl('p', { 
      text: '主要功能：'
    });
    
    const featuresList = container.createEl('ul');
    featuresList.createEl('li', { text: '自动创建必要的文件夹结构和默认提示词文件' });
    featuresList.createEl('li', { text: '自定义文件和文件夹路径' });
    featuresList.createEl('li', { text: '提供AI辅助任务管理所需的提示词模板' });
    featuresList.createEl('li', { text: 'DeepSeek AI集成：使用DeepSeek模型提供智能服务' });
    
    container.createEl('p', { 
      text: '插件版本: 1.0.0'
    });
  }
}