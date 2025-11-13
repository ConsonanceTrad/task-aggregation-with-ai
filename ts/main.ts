import { App, Plugin, Setting, normalizePath, Notice, TFile, WorkspaceLeaf, ItemView, ViewStateResult, MarkdownRenderer, MarkdownView } from 'obsidian';
import { TaskViewerView } from './task-viewer';
import { AIMessagePanel } from './ai-message-panel';
import { AutoTaskPanelWithAISettingsTab } from './settings-tab';
import { AutoTaskPanelWithAISettings, Task } from './types';

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
  refreshInterval: 60000, // 默认1分钟
  clickAction: 'jump', // 默认普通点击跳转到任务行
  ctrlClickAction: 'edit', // 默认Ctrl+点击编辑任务
  aiMessageHistory: [] // 初始化AI消息历史记录为空数组
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

// TaskViewerView moved to task-viewer.ts

// AIMessagePanel moved to ai-message-panel.ts

// AutoTaskPanelWithAISettingsTab moved to settings-tab.ts




// AI消息面板视图类


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
// AutoTaskPanelWithAISettingsTab moved to settings-tab.ts