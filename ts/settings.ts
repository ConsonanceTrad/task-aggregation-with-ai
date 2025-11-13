import { PluginSettingTab, Setting, normalizePath, Notice, App } from 'obsidian';
import AutoTaskPanelWithAI from './main';

export class AutoTaskPanelWithAISettingsTab extends PluginSettingTab {
  plugin: AutoTaskPanelWithAI;
  activeTab: string = 'fileSettings'; // 默认激活文件设置选项卡

  constructor(app: App, plugin: AutoTaskPanelWithAI) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // 创建标签页按钮
    this.createTabs(containerEl);

    // 创建内容区域
    const contentContainer = containerEl.createEl('div', { cls: 'settings-content-container' });

    // 根据当前激活的标签页显示不同的内容
    switch (this.activeTab) {
      case 'fileSettings':
        this.displayFileSettings(contentContainer);
        break;
      case 'autoStart':
        this.displayAutoStartTab(contentContainer);
        break;
      case 'aiFeatures':
        this.displayAIFeaturesTab(contentContainer);
        break;
      case 'habits':
        this.displayHabitsTab(contentContainer);
        break;
      case 'about':
        this.displayAboutTab(contentContainer);
        break;
    }
  }

  // 创建标签页按钮
  private createTabs(container: HTMLElement): void {
    const tabsContainer = container.createEl('div', { cls: 'settings-tabs-container' });

    // 定义所有标签页
    const tabs = [
      { id: 'fileSettings', label: '文件设置', icon: 'folder-open' },
      { id: 'autoStart', label: '自动启动', icon: 'play-circle' },
      { id: 'aiFeatures', label: 'AI功能', icon: 'message-square' },
      { id: 'habits', label: '习惯追踪', icon: 'calendar' },
      { id: 'about', label: '关于', icon: 'info' }
    ];

    // 创建每个标签页按钮
    for (const tab of tabs) {
      const tabButton = tabsContainer.createEl('button', { cls: 'settings-tab-button' });
      tabButton.dataset.tabId = tab.id;

      // 创建图标
      const iconSpan = document.createElement('span');
      iconSpan.className = `icon ${tab.icon}`;
      tabButton.appendChild(iconSpan);

      // 创建文本
      const textSpan = document.createElement('span');
      textSpan.textContent = tab.label;
      tabButton.appendChild(textSpan);

      // 设置激活状态
      if (tab.id === this.activeTab) {
        tabButton.addClass('active');
      }

      // 添加点击事件
      tabButton.addEventListener('click', () => {
        this.activeTab = tab.id;
        this.display(); // 重新渲染页面
      });
    }
  }

  private displayAutoStartTab(container: HTMLElement): void {
    new Setting(container)
      .setName('任务视图面板')
      .setDesc('控制插件是否在启动时自动打开任务视图面板')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.tpvPanelEnabled)
        .onChange(async (value) => {
          this.plugin.settings.tpvPanelEnabled = value;
          await this.plugin.saveSettings();
          new Notice('任务视图面板设置已更新', 2000);
        }));

    new Setting(container)
      .setName('AI消息面板')
      .setDesc('控制插件是否在启动时自动打开AI消息面板')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.aiPanelEnabled)
        .onChange(async (value) => {
          this.plugin.settings.aiPanelEnabled = value;
          await this.plugin.saveSettings();
          new Notice('AI消息面板设置已更新', 2000);
        }));

    new Setting(container)
      .setName('自动创建每日日志')
      .setDesc('控制插件是否在启动时自动创建每日日志文件')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.dailyLogEnabled)
        .onChange(async (value) => {
          this.plugin.settings.dailyLogEnabled = value;
          await this.plugin.saveSettings();
          new Notice('自动创建每日日志设置已更新', 2000);
        }));
  }

  private displayFileSettings(container: HTMLElement): void {
    new Setting(container)
      .setName('任务文件夹路径')
      .setDesc('存放任务文件的文件夹路径')
      .addText(text => text
        .setPlaceholder('AutoTask 任务')
        .setValue(this.plugin.settings.taskFolderPath)
        .onChange(async (value) => {
          this.plugin.settings.taskFolderPath = value;
          await this.plugin.saveSettings();
          new Notice('任务文件夹路径已更新', 2000);
        }));

    new Setting(container)
      .setName('日志文件生成间隔')
      .setDesc('任务文件夹内容自动刷新间隔 (ms)')
      .addText(text => text
        .setPlaceholder('60000 (1分钟)')
        .setValue(String(this.plugin.settings.refreshInterval))
        .onChange(async (value) => {
          const interval = parseInt(value);
          if (!isNaN(interval)) {
            this.plugin.settings.refreshInterval = interval;
            await this.plugin.saveSettings();
            new Notice('日志文件生成间隔已更新', 2000);
          }
        }));

    new Setting(container)
      .setName('普通点击动作')
      .setDesc('点击任务时的默认动作')
      .addDropdown(dropdown => dropdown
        .addOption('jump', '跳转到任务所在行')
        .addOption('edit', '编辑任务')
        .setValue(this.plugin.settings.clickAction)
        .onChange(async (value) => {
          this.plugin.settings.clickAction = value as 'jump' | 'edit';
          await this.plugin.saveSettings();
          new Notice('普通点击动作设置已更新', 2000);
        }));

    new Setting(container)
      .setName('Ctrl+点击动作')
      .setDesc('按住Ctrl键点击任务时的动作')
      .addDropdown(dropdown => dropdown
        .addOption('jump', '跳转到任务所在行')
        .addOption('edit', '编辑任务')
        .setValue(this.plugin.settings.ctrlClickAction)
        .onChange(async (value) => {
          this.plugin.settings.ctrlClickAction = value as 'jump' | 'edit';
          await this.plugin.saveSettings();
          new Notice('Ctrl+点击动作设置已更新', 2000);
        }));
  }

  private displayAIFeaturesTab(container: HTMLElement): void {
    new Setting(container)
      .setName('DeepSeek API Key')
      .setDesc('用于AI功能的API Key')
      .addText(text => text
        .setPlaceholder('your-api-key-here')
        .setValue(this.plugin.settings.deepseekApiKey)
        .onChange(async (value) => {
          this.plugin.settings.deepseekApiKey = value;
          await this.plugin.saveSettings();
          new Notice('DeepSeek API Key已更新', 2000);
        }));

    new Setting(container)
      .setName('数据文件夹路径')
      .setDesc('插件保存数据的文件夹路径')
      .addText(text => text
        .setPlaceholder('_Root/PluginSettings/AutoTaskPanel')
        .setValue(this.plugin.settings.dataFolderPath)
        .onChange(async (value) => {
          this.plugin.settings.dataFolderPath = value;
          await this.plugin.saveSettings();
          new Notice('数据文件夹路径已更新', 2000);
        }));

    new Setting(container)
      .setName('提示文件夹路径')
      .setDesc('存放提示文件的文件夹路径')
      .addText(text => text
        .setPlaceholder('_Root/PluginSettings/AutoTaskPanel/prompts')
        .setValue(this.plugin.settings.promptsFolderPath)
        .onChange(async (value) => {
          this.plugin.settings.promptsFolderPath = value;
          await this.plugin.saveSettings();
          new Notice('提示文件夹路径已更新', 2000);
        }));

    new Setting(container)
      .setName('默认提示文件路径')
      .setDesc('默认使用的提示文件路径')
      .addText(text => text
        .setPlaceholder('_Root/PluginSettings/AutoTaskPanel/prompts/DefaultPrompt.md')
        .setValue(this.plugin.settings.defaultPromptFilePath)
        .onChange(async (value) => {
          this.plugin.settings.defaultPromptFilePath = value;
          await this.plugin.saveSettings();
          new Notice('默认提示文件路径已更新', 2000);
        }));

    new Setting(container)
      .setName('日志模板文件路径')
      .setDesc('日志文件使用的模板文件路径')
      .addText(text => text
        .setPlaceholder('_Root/PluginSettings/AutoTaskPanel/diarySettings.md')
        .setValue(this.plugin.settings.logTemplateFilePath)
        .onChange(async (value) => {
          this.plugin.settings.logTemplateFilePath = value;
          await this.plugin.saveSettings();
          new Notice('日志模板文件路径已更新', 2000);
        }));

    new Setting(container)
      .setName('日志文件保存路径')
      .setDesc('生成的日志文件存放的文件夹路径')
      .addText(text => text
        .setPlaceholder('AutoTask 日志')
        .setValue(this.plugin.settings.logFilesFolderPath)
        .onChange(async (value) => {
          this.plugin.settings.logFilesFolderPath = value;
          await this.plugin.saveSettings();
          new Notice('日志文件保存路径已更新', 2000);
        }));
  }

  private displayHabitsTab(container: HTMLElement): void {
    // TODO: 实现习惯追踪设置
    container.createEl('div', {
      text: '习惯追踪设置',
      cls: 'settings-section-title'
    });
    container.createEl('div', {
      text: '功能开发中...',
      cls: 'settings-section-desc'
    });
  }

  private displayAboutTab(container: HTMLElement): void {
    container.createEl('div', {
      text: 'Auto Task Panel With AI',
      cls: 'settings-section-title'
    });
    container.createEl('div', {
      text: '版本: 1.0.0',
      cls: 'settings-section-desc'
    });
    container.createEl('div', {
      text: '这是一个为Obsidian开发的任务管理插件，集成了AI功能。',
      cls: 'settings-section-desc'
    });
  }

  // 辅助函数：更新设置
  private updateSetting(key: keyof AutoTaskPanelWithAISettingsTab, value: any): void {
    // @ts-ignore
    this.plugin.settings[key] = value;
  }
}
