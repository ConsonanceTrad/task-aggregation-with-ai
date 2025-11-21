import { App, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';
import TaskAI from './main';

export interface TaskAISettings {
	historyFolder: string;
	promptsFolder: string;
	defaultPromptFile: string;
	taskCollectionsFolder: string;
	deepseekApiKey: string;
	deepseekModel: string;
	// Flomo 设置
	isFlomoEnabled: boolean;
	flomoApiKey: string;
	// 定时任务设置
	isTimedTaskEnabled: boolean;
	timedTaskInterval: number;
	triggerPrompt: string;
	timedQueries: Array<{
		time: string;
		promptFile: string;
		targetFile: string;
		enabled: boolean;
		includeCurrentTime: boolean;
		includeTaskInfo: boolean;
	}>;
}

export const DEFAULT_SETTINGS: TaskAISettings = {
	historyFolder: '_Root/plugin/Task-AI/history',
	promptsFolder: '_Root/plugin/Task-AI/prompts',
	defaultPromptFile: '_Root/plugin/Task-AI/prompts/default.md',
	taskCollectionsFolder: 'Task-AI 任务集',
	deepseekApiKey: '',
	deepseekModel: 'deepseek-reasoner',
	// Flomo 设置
	isFlomoEnabled: false,
	flomoApiKey: '',
	// 定时任务设置
	isTimedTaskEnabled: false,
	timedTaskInterval: 1,
	triggerPrompt: `- 你是一个任务整合领域的专家，在正式回答中，请不要列举你做了什么，直接列举结果，这对你应该很容易。另外，格式上如果需要使用缩进以表示从属结构，请使用四个空格形成的缩进。
- 任务特指md文件格式中的任务列表格式（- [ ]未完成任务与- [x]已完成任务）。我需要你根据我给你的任务与当前时间 ，帮我对未完成任务进行任务整合。
- 请准确地、不加扩展地、不臆想捏造地、以下列顺序地、以开始时间顺序精确贴合日期地列举以下信息并列举在独立的md三级标题下：
	1. 以任务列表格式列举今日需要执行的事项（保留源文本信息，但标签只需要保留时间相关标签，其中重复事项不需要多次列举，只需要保留重复规则标签与首个下次需要进行的时间。子任务如果没有指定时间标签则以其所属任务的执行时间为准。） 
	2. 以无序列表形式列举15天以内或未标注执行时间的待办事项，对标签的附加要求与第一点括号内一致（已在第一点内提及的事项此处不需要再次提及）
	3. 以无序列表形式简要描述项目内容（md标题形式记为项目）
	4. 以无序列表形式标明以上所有信息的来源文件`,
	timedQueries: [],
}

export class TaskAISettingsTab extends PluginSettingTab {
	icon = 'robot';
	constructor(app: App, private plugin: TaskAI) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl('h2', { text: 'Task AI 插件设置' });

		// 创建标签页容器
		const tabsContainer = containerEl.createEl('div', { cls: 'setting-tabs' });
		
		// 创建标签页按钮
		const fileTab = tabsContainer.createEl('div', { cls: 'setting-tab active', text: '文件设置' });
		const aiTab = tabsContainer.createEl('div', { cls: 'setting-tab', text: 'API 设置' });
		const triggerTab = tabsContainer.createEl('div', { cls: 'setting-tab', text: '触发式生成' });
		// const extensionTab = tabsContainer.createEl('div', { cls: 'setting-tab', text: '拓展标签' });
		const aboutTab = tabsContainer.createEl('div', { cls: 'setting-tab', text: '关于' });

		// 创建文件设置内容容器
		const fileSettingsContent = containerEl.createEl('div', { cls: 'setting-tab-content active' });
		// 历史消息目录
		new Setting(fileSettingsContent)
			.setName('历史消息目录')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.historyFolder)
				.setValue(this.plugin.settings.historyFolder)
				.onChange(async (value) => {
					this.plugin.settings.historyFolder = value;
					await this.plugin.saveData(this.plugin.settings);
				}));

		// 提示词文件目录
		new Setting(fileSettingsContent)
			.setName('提示词文件目录')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.promptsFolder)
				.setValue(this.plugin.settings.promptsFolder)
				.onChange(async (value) => {
					this.plugin.settings.promptsFolder = value;
					await this.plugin.saveData(this.plugin.settings);
				}));

		// 默认提示词文件
		new Setting(fileSettingsContent)
			.setName('默认问询提示词')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.defaultPromptFile)
				.setValue(this.plugin.settings.defaultPromptFile)
				.onChange(async (value) => {
					this.plugin.settings.defaultPromptFile = value;
					await this.plugin.saveData(this.plugin.settings);
				}));

		// 任务集目录
		new Setting(fileSettingsContent)
			.setName('任务集目录')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.taskCollectionsFolder)
				.setValue(this.plugin.settings.taskCollectionsFolder)
				.onChange(async (value) => {
					this.plugin.settings.taskCollectionsFolder = value;
					await this.plugin.saveData(this.plugin.settings);
				}));
		
		// 创建API设置内容容器
		const aiSettingsContent = containerEl.createEl('div', { cls: 'setting-tab-content' });
		// Deepseek API Key
		new Setting(aiSettingsContent)
			.setName('Deepseek API Key')
			.setDesc('您的 Deepseek API 密钥')
			.addText(text => text
				.setPlaceholder('sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
				.setValue(this.plugin.settings.deepseekApiKey)
				.onChange(async (value) => {
					this.plugin.settings.deepseekApiKey = value;
					await this.plugin.saveData(this.plugin.settings);
				}));

		// Flomo 集成开关
		new Setting(aiSettingsContent)
			.setName('启用 Flomo 集成')
			.setDesc('启用后，触发式生成的结果将发送到 Flomo')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isFlomoEnabled)
				.onChange(async (value) => {
					this.plugin.settings.isFlomoEnabled = value;
					await this.plugin.saveData(this.plugin.settings);
				}));

		// Flomo 专属记录 API URL
		new Setting(aiSettingsContent)
			.setName('Flomo 专属记录 API URL')
			.setDesc('您的 Flomo 专属记录 API 链接，可在 Flomo 设置 - API 中获取')
			.addText(text => text
				.setPlaceholder('https://flomoapp.com/iwh/xxxxxxxxxxxxxxxxxxxx')
				.setValue(this.plugin.settings.flomoApiKey)
				.onChange(async (value) => {
					this.plugin.settings.flomoApiKey = value;
					await this.plugin.saveData(this.plugin.settings);
				}));

		// 创建触发式生成设置内容容器
		const triggerSettingsContent = containerEl.createEl('div', { cls: 'setting-tab-content task-ai-trigger-settings-content' });
		// 定时任务开关
		new Setting(triggerSettingsContent)
			.setName('启用触发生成')
			.setDesc('启用后插件依照任务表触发生成')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isTimedTaskEnabled)
				.onChange(async (value) => {
					this.plugin.settings.isTimedTaskEnabled = value;
					await this.plugin.saveData(this.plugin.settings);
					// 通知主程序更新定时任务状态
					this.app.workspace.trigger('taskai:update-timed-task', value);
				}));

		// 定时任务检查间隔
		new Setting(triggerSettingsContent)
			.setName('触发间隔（分钟）')
			.setDesc('插件触发生成的间隔')
			.addText(text => text
				.setValue(this.plugin.settings.timedTaskInterval.toString())
				.onChange(async (value) => {
					const interval = parseInt(value);
					if (!isNaN(interval) && interval > 0) {
						this.plugin.settings.timedTaskInterval = interval;
						await this.plugin.saveData(this.plugin.settings);
						// 通知主程序更新检查间隔
						this.app.workspace.trigger('taskai:update-timed-interval', interval);
					}
				}));


		// 触发式生成表格
		triggerSettingsContent.createEl('div', { cls: 'setting-section-divider' });
		triggerSettingsContent.createEl('h4', { text: '触发式生成设置' });

		// 创建表格容器
		const tableContainer = triggerSettingsContent.createEl('div', { cls: 'timed-queries-table-container' });
		const table = tableContainer.createEl('table', { cls: 'timed-queries-table' });

		// 创建表格标题
		const thead = table.createEl('thead');
		const headerRow = thead.createEl('tr');
		headerRow.createEl('th', { text: '时间', cls: 'timed-queries-column' });
		headerRow.createEl('th', { text: '提示词', cls: 'timed-queries-column' });
		headerRow.createEl('th', { text: '输入时间', cls: 'timed-queries-column' });
		headerRow.createEl('th', { text: '输入任务', cls: 'timed-queries-column' });
		headerRow.createEl('th', { text: '启用规则', cls: 'timed-queries-column' });
		headerRow.createEl('th', { text: '操作', cls: 'timed-queries-column' });

		// 创建表格内容
		const tbody = table.createEl('tbody', { cls: 'timed-queries-table-body' });

		// 渲染触发式生成列表
		const renderTimedQueries = async () => {
			// 清空表格内容
			tbody.empty();

			// 获取所有提示词文件
			const promptFiles = await this.app.vault.adapter.list(this.plugin.settings.promptsFolder);
			const mdFiles = promptFiles.files.filter(file => file.endsWith('.md')).map(file => `${this.plugin.settings.promptsFolder}/${file}`);

			// 添加新行
			this.plugin.settings.timedQueries.forEach((query, index) => {
				const row = tbody.createEl('tr', { cls: 'timed-queries-row' });

				// 时间列
				const timeCell = row.createEl('td', { cls: 'timed-queries-cell' });
				const timeInput = timeCell.createEl('input', { type: 'time', value: query.time, cls: 'timed-queries-input' });
				timeInput.addEventListener('change', async () => {
					this.plugin.settings.timedQueries[index].time = timeInput.value;
					await this.plugin.saveData(this.plugin.settings);
					// 通知主程序更新定时查询
					this.app.workspace.trigger('taskai:update-timed-queries');
				});

				// 提示词文件列
				const promptCell = row.createEl('td', { cls: 'timed-queries-cell' });
				const promptSelect = promptCell.createEl('select', { cls: 'timed-queries-select' });

				// 添加默认提示词选项
				const defaultOption = promptSelect.createEl('option', { text: '[默认提示词]', value: '__default__' });
				if (query.promptFile === '__default__') {
					defaultOption.selected = true;
				}

				// 添加所有提示词文件选项
				mdFiles.forEach(file => {
					const filename = file.split('/').pop();
					const option = promptSelect.createEl('option', { text: filename, value: file });
					if (file === query.promptFile && query.promptFile !== '__default__') {
						option.selected = true;
					}
				});

				promptSelect.addEventListener('change', async () => {
					this.plugin.settings.timedQueries[index].promptFile = promptSelect.value;
					await this.plugin.saveData(this.plugin.settings);
					// 通知主程序更新定时查询
					this.app.workspace.trigger('taskai:update-timed-queries');
				});


				// 包含当前时间列
				const includeTimeCell = row.createEl('td', { cls: 'timed-queries-cell' });
				const includeTimeToggle = includeTimeCell.createEl('input', { type: 'checkbox', cls: 'timed-queries-toggle' });
				includeTimeToggle.checked = query.includeCurrentTime;
				includeTimeToggle.addEventListener('change', async () => {
					this.plugin.settings.timedQueries[index].includeCurrentTime = includeTimeToggle.checked;
					await this.plugin.saveData(this.plugin.settings);
					// 通知主程序更新定时查询
					this.app.workspace.trigger('taskai:update-timed-queries');
				});

				// 包含任务信息列
				const includeTaskInfoCell = row.createEl('td', { cls: 'timed-queries-cell' });
				const includeTaskInfoToggle = includeTaskInfoCell.createEl('input', { type: 'checkbox', cls: 'timed-queries-toggle' });
				includeTaskInfoToggle.checked = query.includeTaskInfo;
				includeTaskInfoToggle.addEventListener('change', async () => {
					this.plugin.settings.timedQueries[index].includeTaskInfo = includeTaskInfoToggle.checked;
					await this.plugin.saveData(this.plugin.settings);
					// 通知主程序更新定时查询
					this.app.workspace.trigger('taskai:update-timed-queries');
				});

					
				// 启用开关列
				const enabledCell = row.createEl('td', { cls: 'timed-queries-cell' });
				const enabledToggle = enabledCell.createEl('input', { type: 'checkbox', cls: 'timed-queries-toggle' });
				enabledToggle.checked = query.enabled;
				enabledToggle.addEventListener('change', async () => {
					this.plugin.settings.timedQueries[index].enabled = enabledToggle.checked;
					await this.plugin.saveData(this.plugin.settings);
					// 通知主程序更新定时查询
					this.app.workspace.trigger('taskai:update-timed-queries');
				});

				// 按钮列
				const actionCell = row.createEl('td', { cls: 'timed-queries-cell' });
				// 触发按钮
				const testButton = actionCell.createEl('button', { text: '触发', cls: 'timed-queries-test-button' });
				testButton.addEventListener('click', async () => {
					new Notice('规则开始执行');
					// 调用主程序的executeTimedQuery方法执行一次查询
					await this.plugin.executeTimedQuery(query);
					new Notice('规则已被执行');
				});
				// 删除按钮
				const deleteButton = actionCell.createEl('button', { text: '删除', cls: 'timed-queries-delete-button' });
				deleteButton.addEventListener('click', async () => {
					this.plugin.settings.timedQueries.splice(index, 1);
					await this.plugin.saveData(this.plugin.settings);
					renderTimedQueries();
					// 通知主程序更新定时查询
					this.app.workspace.trigger('taskai:update-timed-queries');
				});
			});
		};

		// 添加新触发式生成按钮
		new Setting(triggerSettingsContent)
			.addButton(button => button
				.setButtonText('添加新的触发式生成')
				.setCta()
				.onClick(async () => {
					this.plugin.settings.timedQueries.push({
					time: '09:00',
					promptFile: '__default__',
					targetFile: '{{today}}.md',
					enabled: true,
					includeCurrentTime: true,
					includeTaskInfo: true
				});
					await this.plugin.saveData(this.plugin.settings);
					renderTimedQueries();
					// 通知主程序更新定时查询
					this.app.workspace.trigger('taskai:update-timed-queries');
				}));

		triggerSettingsContent.createEl('h4', { text: '触发式生成提示词' });
		// 触发式生成提示词
		new Setting(triggerSettingsContent)
			.addTextArea(textArea => {
				textArea.setValue(this.plugin.settings.triggerPrompt)
				.onChange(async (value) => {
					this.plugin.settings.triggerPrompt = value;
					await this.plugin.saveData(this.plugin.settings);
				})
				.setPlaceholder('请输入提示词...')
				// 应用外部样式
				textArea.inputEl.classList.add('task-ai-default-prompt');
			});


		// 渲染初始数据
		renderTimedQueries();

		// 创建拓展标签设置内容容器
		// const extensionSettingsContent = containerEl.createEl('div', { cls: 'setting-tab-content' });
		// extensionSettingsContent.createEl('p', { text: '将在后续版本完善' });

		// 创建关于设置内容容器
		const aboutSettingsContent = containerEl.createEl('div', { cls: 'setting-tab-content' });
		aboutSettingsContent.createEl('h3', { text: '关于 Task AI' });
		aboutSettingsContent.createEl('p', { text: 'Task AI 插件是为了整合我所要做的事项所开发的自用插件，一些操作的设计会更贴合我的习惯，影响最大的可能是这个插件暂时只使用 Deepseek 的解释模型进行交互，后续可能会考虑加入其他模型。我会持续根据我自身的需求进行优化，如果时间充裕，我会根据社区反馈进行调整。' });
		aboutSettingsContent.createEl('p', { text: '这个插件的设计目的是：针对我这样不习惯使用类似 Task 那样严格定义的语法的人，通过整合 AI 深度思考，以自动化的列举每日需完成的事项。' });
		aboutSettingsContent.createEl('h3', { text: '入门教程' });
		aboutSettingsContent.createEl('p', { text: '在使用所有功能前，你需要注册一个 Deepseek 开放平台账号，获取到 API Key，并充值一定的金额。' });
		aboutSettingsContent.createEl('p', { text: '其次，你需要打开核心插件日记，以供触发式生成写出结果。' });
		aboutSettingsContent.createEl('p', { text: '主要功能：触发式生成。此功能可以根据你设置的定时任务，自动读取任务集文件夹发送向 AI 让其进行任务整合，将结果写入当天的日记文件中。' });
		aboutSettingsContent.createEl('p', { text: '此外，如果你拥有 flomo 平台会员，你可以在插件设置中配置 flomo API ，使插件在触发式生成后，自动将结果发送到 flomo 平台，方便你在手机端查看。' });
		aboutSettingsContent.createEl('p', { text: '辅助功能：持续性对话与以时间戳形式保存对话记录，通过指令开启发送消息的模态框，以选定的提示词文件向AI进行持续询问。' });
		aboutSettingsContent.createEl('h3', { text: '更新日志' });
		aboutSettingsContent.createEl('p', { text: 'v1.0.0: 完成两项基本功能搭建，包括自定义提示词的持续性对话与保存、自定义提示词的定时任务整合、完成定时任务后自动化的发送向 flomo 平台以方便手机端查阅。' });

		// 标签页切换逻辑
		const tabs = [fileTab, aiTab, triggerTab, aboutTab];
		const tabContents = [fileSettingsContent, aiSettingsContent, triggerSettingsContent, aboutSettingsContent];

		tabs.forEach((tab, index) => {
			tab.addEventListener('click', () => {
				// 移除所有标签页的active类
				tabs.forEach(t => t.classList.remove('active'));
				// 移除所有内容的active类
				tabContents.forEach(c => c.classList.remove('active'));
				// 添加当前标签页和内容的active类
				tab.classList.add('active');
				tabContents[index].classList.add('active');
			});
		});
	}
}
