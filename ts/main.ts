import { Plugin, Notice, App, Modal, EventRef, requestUrl, RequestUrlResponse } from 'obsidian';
// import { AI_Message_Panel, VIEW_TYPE_AI_MESSAGE } from './panel/ai-message-panel';
import { TaskAISettings, DEFAULT_SETTINGS, TaskAISettingsTab } from './settings';
import { DailyConfig } from './dailyConfig';

export default class TaskAI extends Plugin {
	private currentSessionId: string = this.generateSessionId();
	private sessionMessages: Map<string, Array<{ role: string; content: string }>> = new Map();
	private isSendingMessage: boolean = false;
	// 触发式生成队列相关
	private isTriggerGenerating: boolean = false;
	private triggerQueue: Array<{ time: string; promptFile: string; targetFile: string; enabled: boolean; includeCurrentTime: boolean; includeTaskInfo: boolean }> = [];
	// 定时任务相关
	private timedTaskTimer: number | null = null;
	private lastCheckedMinute: number = -1;
	// 状态栏相关
	private statusBarItem: HTMLElement | null = null;

	// 生成会话ID
	private generateSessionId(): string {
		return Date.now().toString();
	}

	// 开始新会话
	private async startNewSession(): Promise<void> {
		if (this.isSendingMessage) {
			new Notice("Sending Message Forward. Please wait.");
			return;
		}
		
		this.currentSessionId = this.generateSessionId();
		// 清空当前会话的消息历史
		this.sessionMessages.delete(this.currentSessionId);
		
		// 在设置的历史文件夹中创建会话文件
		const historyFilePath = `${this.settings.historyFolder}/task-ai-${this.currentSessionId}.md`;
		const initialContent = `# Task AI 会话 ${this.currentSessionId}\n\n## 会话信息\n\n`;
		try {
			await this.app.vault.adapter.write(historyFilePath, initialContent);
		} catch (error) {
			console.error('Error creating history file:', error);
			new Notice("Failed to create session history file.");
		}
		
		new Notice('New session started.');
		// 更新所有打开的AI消息面板的会话ID显示
		// const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_AI_MESSAGE);
		// leaves.forEach(leaf => {
		// 	const view = leaf.view;
		// 	if (view instanceof AI_Message_Panel) {
		// 		view.updateSessionId(this.currentSessionId);
		// 		view.addSessionSeparator();
		// 	}
		// });
	}
	
	async onload() {
		// console.log(`[TaskAI] Loading plugin...`);
		// 初始化设置
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

		// 注册设置选项卡
		this.addSettingTab(new TaskAISettingsTab(this.app, this));

		// 初始化定时任务
		this.initTimedTask();

		// 监听定时任务更新事件
		this.registerEvent(this.app.vault.on('create', () => {
			window.setInterval(() => this.checkTimedTasks(), this.settings.timedTaskInterval * 60 * 1000)
		}));

		// 监听定时任务间隔更新事件
		this.registerEvent(this.app.vault.on('create', () => {
			if (this.settings.isTimedTaskEnabled) {
				this.stopTimedTask();
				this.startTimedTask();
			}
		}));
		
		// 监听定时查询更新事件
		this.registerEvent(this.app.vault.on('create', () => {
			window.setInterval(() => this.updateStatusBar(), 500);
		}));

		// 注册布局就绪事件
		this.app.workspace.onLayoutReady(async () => {
			let structureCreated = false;
			// console.log(`[TaskAI] Starting structure creation...`);
			
			// 创建历史消息目录
			// const created2 = await this.createFolder(this.settings.historyFolder);
			// structureCreated = structureCreated || created2;
			// console.log(`[TaskAI] Created history folder: ${created2}, structureCreated: ${structureCreated}`);

			// 创建提示词文件目录
			// const created3 = await this.createFolder(this.settings.promptsFolder);
			// structureCreated = structureCreated || created3;
			// console.log(`[TaskAI] Created prompts folder: ${created3}, structureCreated: ${structureCreated}`);
				
			// 创建默认提示词文件
			// const created4 = await this.createDefaultPromptFile();
			// structureCreated = structureCreated || created4;
			// console.log(`[TaskAI] Created file: ${created4}, structureCreated: ${structureCreated}`);
				
			// 创建任务集目录
			const created5 = await this.createFolder(this.settings.taskCollectionsFolder);
			structureCreated = structureCreated || created5;
			// console.log(`[TaskAI] Created task collections folder: ${created5}, structureCreated: ${structureCreated}`);
			// console.log(`[TaskAI] Final structureCreated: ${structureCreated}`);
			if (structureCreated) {
				setTimeout(() => {
					new Notice("Task AI : Structure Created.");
				}, 500);
			} else {
				// console.log(`[TaskAI] No structure created, skipping notice`);
			}
			
			// 在右侧边栏打开面板
			// await this.openAIMessagePanel();
		});

		// 注册AI消息面板视图
		// this.registerView(
		// 	VIEW_TYPE_AI_MESSAGE,
		// 	(leaf) => new AI_Message_Panel(leaf)
		// );
		
		// 注册命令：打开AI消息面板
		// this.addCommand({
		// 	id: 'ai-message-panel-open',
		// 	name: '打开 AI 消息面板',
		// 	callback: () => this.openAIMessagePanel()
		// });
		
		// 注册命令：发送查询给AI
		// this.addCommand({
		// 	id: 'ai-message-send-query',
		// 	name: '询问 AI',
		// 	callback: () => this.showAIQueryDialog()
		// });

		// // 监听面板打开事件，更新会话ID
		// this.registerEvent(this.app.vault.on('create', () => {
		// 	// 获取所有已打开的AI消息面板实例并更新会话ID
		// 	const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_AI_MESSAGE);
		// 	leaves.forEach(leaf => {
		// 		if (leaf.view instanceof AI_Message_Panel) {
		// 			leaf.view.updateSessionId(this.currentSessionId);
		// 		}
		// 	});
		// }));

		// 初始化状态栏
		this.statusBarItem = this.addStatusBarItem();
		this.updateStatusBar();
		// 其他插件初始化逻辑
	}

	// 计算下次触发时间的辅助方法
	private getNextTriggerTime(): Date | null {
		// 获取所有启用的定时查询
		const enabledQueries = this.settings.timedQueries.filter(query => query.enabled);
		if (enabledQueries.length === 0) {
			return null;
		}
		
		const now = new Date();
		let nextTime: Date | null = null;
		
		// 计算每个查询的下次触发时间
		for (const query of enabledQueries) {
			const [hours, minutes] = query.time.split(':').map(Number);
			const queryTime = new Date(now);
			queryTime.setHours(hours, minutes, 0, 0);
			
			// 如果查询时间已过，设置为明天同一时间
			if (queryTime < now) {
				queryTime.setDate(queryTime.getDate() + 1);
			}
			
			// 更新下次触发时间
			if (!nextTime || queryTime < nextTime) {
				nextTime = queryTime;
			}
		}
		
		return nextTime;
	}
	
	// 更新状态栏显示的方法
	private updateStatusBar(): void {
		if (!this.statusBarItem) {
			return;
		}
		
		const nextTime = this.getNextTriggerTime();
		if (nextTime) {
			// 格式化时间为HH:mm
			const hours = nextTime.getHours().toString().padStart(2, '0');
			const minutes = nextTime.getMinutes().toString().padStart(2, '0');
			this.statusBarItem.setText(`Next: ${hours}:${minutes}`);
		} else {
			// 没有启用的定时查询，清空状态栏
			this.statusBarItem.setText('');
			this.statusBarItem.title = '';
		}
	}
	
// 	// AI查询对话框类
// 	private QueryModal = class extends Modal {
// 		private onSubmit: (userInput: string, selectedPrompt: string) => void;
// 		private prompts: string[];
// 		private defaultPrompt: string;
// 		private historyFolder: string;
// 		private sessionId: string;

// 		constructor(app: App, prompts: string[], defaultPrompt: string, historyFolder: string, sessionId: string, onSubmit: (userInput: string, selectedPrompt: string) => void) {
// 			super(app);
// 			this.prompts = prompts;
// 			this.setTitle("ASK DEEPSEEK");
// 			this.defaultPrompt = defaultPrompt;
// 			this.historyFolder = historyFolder;
// 			this.sessionId = sessionId;
// 			this.onSubmit = onSubmit;
// 		}

// 		onOpen() {
// 			const { contentEl } = this;

// 			const inputDiv = contentEl.createEl('div', { cls: 'ai-query-modal-input' });
// 			const input = inputDiv.createEl('textarea', { 
// 				placeholder: 'Enter your question here...', 
// 				attr: { rows: "5" },
// 				cls: 'ai-query-modal-textarea'
// 			});

// 			const selectDiv = contentEl.createEl('div', { cls: 'ai-query-modal-select' });
// 			const selectLabel = selectDiv.createEl('label', { text: 'Select prompt:' });
// 			const select = selectDiv.createEl('select', { cls: 'ai-query-modal-select-dropdown' });

// 			// 添加提示词选项
// 			this.prompts.forEach(file => {
// 				const filename = file.split('/').pop();
// 				const option = select.createEl('option', { text: filename, value: file });
// 				if (file === this.defaultPrompt) {
// 					option.selected = true;
// 				}
// 			});

// 			// 历史文件名提示
// 			const historyInfo = contentEl.createEl('div', { cls: 'ai-query-modal-history-info' });
// 			historyInfo.textContent = `历史记录将保存到: ${this.historyFolder}/task-ai-${this.sessionId}.md`;
			
// 			// 按钮
// 			const buttonContainer = contentEl.createEl('div', { cls: 'ai-query-modal-buttons' });
			
// 			const fastInfo = buttonContainer.createEl('span', { cls: 'ai-query-modal-fast-info' });
// 			fastInfo.textContent = `Press Ctrl + Enter to send quickly`;

// 			const cancelButton = buttonContainer.createEl('button', { 
// 				text: 'Cancel', 
// 				cls: 'ai-query-modal-button cancel'
// 			});

// 			cancelButton.addEventListener('click', () => this.close());

// 			const sendButton = buttonContainer.createEl('button', { 
// 				text: 'Send', 
// 				cls: 'ai-query-modal-button send'
// 			});

// 			// 添加 Ctrl+Enter 键盘事件监听器
// 			input.addEventListener('keydown', (event: KeyboardEvent) => {
// 				if (event.ctrlKey && event.key === 'Enter') {
// 					sendButton.click();
// 				}
// 			});

// 			sendButton.addEventListener('click', () => {
// 				const userInput = input.value.trim();
// 				const selectedPrompt = select.value;
				
// 				if (userInput) {
// 					this.onSubmit(userInput, selectedPrompt);
// 					this.close();
// 				} else {
// 					new Notice("Empty input. Please enter a question.");
// 				}
// 			});

// 		}

// 		onClose() {
// 			const { contentEl } = this;
// 			contentEl.empty();
// 		}
// 	};

// 	// 显示AI查询对话框
// 	private async showAIQueryDialog() {
// 		// 1. 列出提示词文件夹中的所有.md文件
// 		const promptFiles = await this.app.vault.adapter.list(this.settings.promptsFolder);
// 		const mdFiles = promptFiles.files.filter(f => f.endsWith('.md'));

// 		// 2. 显示对话框
// 		const modal = new this.QueryModal(
// 			this.app, mdFiles, this.settings.defaultPromptFile, 
// 			this.settings.historyFolder, this.currentSessionId, 
// 			async (userInput, selectedPrompt) => {
// 				try {
// 					// 读取选中的提示词内容
// 					const promptContent = await this.app.vault.adapter.read(selectedPrompt);
// 					// 组合完整的消息
// 					const fullMessage = `${promptContent}

// 用户问题: ${userInput}
// 会话ID: ${this.currentSessionId}`;
					
// 					// 发送到DeepSeek API
// 					this.sendToDeepSeek(fullMessage, userInput, selectedPrompt);
// 				} catch (error) {
// 					console.error('Error in AI query process:', error);
// 					new Notice('Failed to process AI query. Please check console for details.');
// 				}
// 			}
// 		);
// 		modal.open();
// 	}

// 	// 发送请求到DeepSeek API
// 	private async replaceDoubleBracketsWithFileContent(input: string): Promise<string> {
// 		// 匹配Obsidian双链结构：[[文件名]] 或 [[文件夹/文件名]] 或 [[文件名|显示文本]]
// 		const doubleBracketRegex = /\[\[(.*?)(?:\|.*?)?\]\]/g;
// 		const matches = input.matchAll(doubleBracketRegex);
// 		let result = input;

// 		for (const match of matches) {
// 			const fullMatch = match[0];
// 			let linkText = match[1].trim();

// 			// 查找对应的文件
// 			// 先尝试直接匹配完整路径
// 			let file = this.app.vault.getFiles().find(f => f.path === linkText);
// 			if (!file && !linkText.endsWith('.md')) {
// 				// 如果没有扩展名且未找到，尝试添加.md扩展名
// 				file = this.app.vault.getFiles().find(f => f.path === `${linkText}.md`);
// 			}
			
// 			if (!file) {
// 				// 再尝试只匹配文件名部分（不包括路径）
// 				const fileName = linkText.split('/').pop() || linkText;
// 				file = this.app.vault.getFiles().find(f => f.name === fileName);
// 				if (!file && !fileName.endsWith('.md')) {
// 					// 尝试添加.md扩展名
// 					file = this.app.vault.getFiles().find(f => f.name === `${fileName}.md`);
// 				}
// 			}

// 			if (file) {
// 				try {
// 					// 读取文件内容
// 					const content = await this.app.vault.adapter.read(file.path);
// 					// 替换双链为文件内容
// 					result = result.replace(fullMatch, content);
// 				} catch (error) {
// 					console.error(`Error reading file ${linkText}:`, error);
// 					// 如果读取失败，保留原始双链
// 				}
// 			} else {
// 				// 如果文件不存在，保留原始双链
// 				console.error(`File not found: ${linkText}`);
// 			}
// 		}

// 		return result;
// 	}

// 	private async sendToDeepSeek(prompt: string, userInput: string, selectedPrompt: string) {
// 		if (!this.settings.deepseekApiKey) {
// 			new Notice('Set Your DeepSeek API Key To Use This Feature。');
// 			return;
// 		}
		
// 		// 替换双链为文件内容
// 		const processedPrompt = await this.replaceDoubleBracketsWithFileContent(prompt);
// 		const processedUserInput = await this.replaceDoubleBracketsWithFileContent(userInput);

// 		// 设置发送状态为true
// 		this.isSendingMessage = true;

// 		const apiKey = this.settings.deepseekApiKey;
// 		const model = this.settings.deepseekModel;

// 		try {
// 			// 获取当前会话的消息历史
// 			let messages = this.sessionMessages.get(this.currentSessionId) || [];
// 			// 如果是第一次请求，添加处理后的系统提示
// 			if (messages.length === 0) {
// 				messages.push({ role: 'system', content: processedPrompt });
// 			}
			
// 			// 添加处理后的用户输入
// 			messages.push({ role: 'user', content: processedUserInput });
			
// 			const response = await requestUrl({
// 				url: 'https://api.deepseek.com/v1/chat/completions',
// 				method: 'POST',
// 				headers: {
// 					'Content-Type': 'application/json',
// 					'Authorization': `Bearer ${apiKey}`
// 				},
// 				body: JSON.stringify({
// 					model: model,
// 					messages: messages,
// 					temperature: 0.7,
// 					top_p: 0.95,
// 					stream: true // 启用流式输出
// 				})
// 			});

// 			// if (!response.ok) {
// 			// 	const errorData = await response.json();
// 			// 	throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
// 			// }

// 			// 处理流式响应
// 			const aiResponse = await this.handleStreamResponse(response, userInput);
			
// 			// 保存AI响应到消息历史
// 			messages.push({ role: 'assistant', content: aiResponse });
			
// 			// 将消息写入会话文件
// 			const historyFilePath = `${this.settings.historyFolder}/task-ai-${this.currentSessionId}.md`;
// 			const promptFilename = selectedPrompt.split('/').pop() || 'UnknownPrompt.md';
// 			const contentToAppend = `
// ---
// ## ${new Date().toISOString()}

// ### 使用的提示词文件
// ${promptFilename}

// ### 用户问题
// ${userInput}

// ### AI回答
// ${aiResponse}
// `;
			
// 			try {
// 				await this.app.vault.adapter.append(historyFilePath, contentToAppend);
// 			} catch (error) {
// 				console.error('Error appending to history file:', error);
// 			}
			
// 			new Notice('AI query completed');
// 		} catch (error) {
// 			console.error('Error sending to DeepSeek API:', error);
// 			new Notice(`Failed to send query: ${error instanceof Error ? error.message : 'Unknown error'}`);
// 		} finally {
// 			// 设置发送状态为false
// 			this.isSendingMessage = false;
// 		}
// 	}

	// 处理流式响应
	// private async handleStreamResponse(response: RequestUrlResponse, userInput: string): Promise<string> {
	// 	// 检查响应是否有效
	// 	if (!response.text) {
	// 		throw new Error('No response body');
	// 	}

	// 	// 将用户消息添加到消息面板
	// 	// await this.addUserMessageToPanel(userInput);

	// 	// 创建空的AI消息元素用于流式输出
	// 	const aiMessageElement = await this.createEmptyAIMessage();
	// 	if (!aiMessageElement) {
	// 		throw new Error('Could not create AI message element');
	// 	}

	// 	let fullResponse = '';

	// 	try {
	// 		// 直接使用RequestUrlResponse的text属性
	// 		const responseText = response.text;
			
	// 		// 处理SSE事件格式的响应文本
	// 		const lines = responseText.split('\n');
	// 		let buffer = '';

	// 		for (const line of lines) {
	// 			const trimmedLine = line.trim();
	// 			if (!trimmedLine) continue;
	// 			if (trimmedLine.startsWith(':')) continue; // 忽略注释

	// 			const [event, data] = trimmedLine.split(': ', 2);
	// 			if (event !== 'data' || data === '[DONE]') continue;

	// 			// 解析JSON数据
	// 			try {
	// 				const jsonData = JSON.parse(data);
	// 				const content = jsonData.choices[0].delta.content || '';
	// 				if (content) {
	// 					// 更新AI消息元素
	// 					await this.updateAIMessageElement(aiMessageElement, content);
	// 					// 累积完整响应
	// 					fullResponse += content;
	// 				}
	// 			} catch (jsonError) {
	// 				console.error('Error parsing JSON data:', jsonError);
	// 			}
	// 		}
	// 	} catch (error) {
	// 		console.error('Error handling stream response:', error);
	// 		throw error;
	// 	}
		
	// 	return fullResponse;
	// }

	// 将用户消息添加到AI消息面板
	// private async addUserMessageToPanel(userMessage: string) {
	// 	// 确保面板已打开
	// 	await this.openAIMessagePanel();

	// 	// 获取面板视图
	// 	const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_AI_MESSAGE);
	// 	if (leaves.length > 0) {
	// 		const leaf = leaves[0];
	// 		if (leaf.view instanceof AI_Message_Panel) {
	// 			leaf.view.addMessageToContainer(userMessage, 'user');
	// 		}
	// 	}
	// }

	// 创建空的AI消息元素
	// private async createEmptyAIMessage(): Promise<HTMLElement | null> {
	// 	// 确保面板已打开
	// 	await this.openAIMessagePanel();

	// 	// 获取面板视图
	// 	const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_AI_MESSAGE);
	// 	if (leaves.length > 0) {
	// 		const leaf = leaves[0];
	// 		if (leaf.view instanceof AI_Message_Panel) {
	// 			return leaf.view.createEmptyAIMessage();
	// 		}
	// 	}
	// 	return null;
	// }

	// 更新AI消息元素内容
	// private async updateAIMessageElement(messageElement: HTMLElement, content: string) {
	// 	// 获取面板视图
	// 	const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_AI_MESSAGE);
	// 	if (leaves.length > 0) {
	// 		const leaf = leaves[0];
	// 		if (leaf.view instanceof AI_Message_Panel) {
	// 			await leaf.view.updateMessageElement(messageElement, content);
	// 		}
	// 	}
	// }

	// private async openAIMessagePanel(): Promise<void> {
	// 	// 检查面板是否已经打开
	// 	const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_AI_MESSAGE);
	// 	if (existing.length > 0) {
	// 		return;
	// 	}
		
	// 	// 在右侧边栏打开新面板
	// 	const rightLeaf = this.app.workspace.getRightLeaf(false);
	// 	if (rightLeaf) {
	// 		await rightLeaf.setViewState({
	// 			type: VIEW_TYPE_AI_MESSAGE
	// 		});
	// 		// 获取新创建的面板实例并更新会话ID
	// 		const view = rightLeaf.view;
	// 		if (view instanceof AI_Message_Panel) {
	// 			view.updateSessionId(this.currentSessionId);
	// 		}
	// 	}
	// }


	onunload() {
		// 注销AI消息面板视图
		// this.app.workspace.detachLeavesOfType(VIEW_TYPE_AI_MESSAGE);
		// 停止定时任务
		this.stopTimedTask();
		// 其他插件卸载逻辑
	}

	private async createFolder(path: string): Promise<boolean> {
		// console.log(`[TaskAI] Checking folder: ${path}`);
		const exists = await this.app.vault.adapter.exists(path);
		// console.log(`[TaskAI] Folder ${path} exists: ${exists}`);
		if (!exists) {
			await this.app.vault.adapter.mkdir(path);
			// console.log(`[TaskAI] Created folder: ${path}`);
			return true;
		}
		return false;
	}

	// 定时任务相关方法
	private initTimedTask() {
		if (this.settings.isTimedTaskEnabled) {
			this.startTimedTask();
		}
	}

	private async startTimedTask() {
		this.stopTimedTask(); // 确保只运行一个定时器
		
		// 设置每分钟检查一次
		window.setInterval(async () => 
			await this.checkTimedTasks().catch(error => {console.error('Error in timed task:', error);}), 
			this.settings.timedTaskInterval * 60 * 1000
		);
		
		// 立即检查一次
		await this.checkTimedTasks();
	}

	private stopTimedTask() : void {
		if (this.timedTaskTimer) {
			clearInterval(this.timedTaskTimer);
			this.timedTaskTimer = null;
		}
		// 更新状态栏显示
		this.updateStatusBar();
	}

	private async checkTimedTasks() {
		const now = new Date();
		const currentHour = now.getHours().toString().padStart(2, '0');
		const currentMinute = now.getMinutes().toString().padStart(2, '0');
		const currentTime = `${currentHour}:${currentMinute}`;
		
		// 只在每分钟的第一秒检查一次
		const currentMinuteNum = now.getMinutes();
		if (this.lastCheckedMinute === currentMinuteNum) {
			return;
		}
		this.lastCheckedMinute = currentMinuteNum;
		
		// 检查所有定时任务
		for (const query of this.settings.timedQueries) {
			if (query.enabled && query.time === currentTime) {
				await this.executeTimedQuery(query);
			}
		}
		
		// 更新状态栏显示
		this.updateStatusBar();
	}

	public async executeTimedQuery(query: { time: string; promptFile: string; targetFile: string; enabled: boolean; includeCurrentTime: boolean; includeTaskInfo: boolean }) {
		// 如果有正在进行的触发式生成，将当前查询加入队列
		if (this.isTriggerGenerating) {
			this.triggerQueue.push(query);
			new Notice(`Triggered generation added to queue: ${query.time}.
Note: The more prompt and task information, the longer it will take to generate. Please be patient.`);
			return;
		}
		
		try {
			// 设置生成状态为正在进行
			this.isTriggerGenerating = true;
			
			// 1. 使用默认提示词（如果选择了默认选项且已设置），否则使用提示词文件
			let promptContent: string;
			if (query.promptFile === '__default__') {
				// 优先使用触发式生成专用的默认提示词
				promptContent = this.settings.triggerPrompt;
			} else {
				promptContent = await this.app.vault.adapter.read(query.promptFile);
			}
			// console.log(`[TaskAI] 开始发送信息到 Deepseek `);
			
			// 2. 解析目标文件路径（支持{{today}}、{{systemDailyNote}}等变量）
			const now = new Date();
			const today = now.toISOString().split('T')[0];
			let targetFilePath = query.targetFile.replace('{{today}}', today);
			
			// 处理系统核心插件日记指向的今日日记文件
			if (targetFilePath === '{{systemDailyNote}}' || targetFilePath.startsWith('{{systemDailyNote}}/')) {
				try {
					const dailyNotesConfig = await this.getDailyNotesConfigFromFile();
					// 使用类型保护确保moment存在且有format方法
					const momentInstance = window.moment;
					const format = dailyNotesConfig?.format;
					const folder = dailyNotesConfig?.folder;
					if (momentInstance && typeof momentInstance === 'function' && typeof momentInstance().format === 'function') {
						const dailyNoteDate = momentInstance().format(format);
						const dailyNotePath = `${folder}/${dailyNoteDate}.md`;
						
						if (targetFilePath === '{{systemDailyNote}}') {
							targetFilePath = dailyNotePath;
						} else {
							// 处理类似{{systemDailyNote}}/section.md的情况
							const suffix = targetFilePath.replace('{{systemDailyNote}}', '');
							targetFilePath = dailyNotePath + suffix;
						}
						// console.log(`使用系统日记文件路径: ${targetFilePath}`);
					}
					
				} catch (error) {
					console.error('获取系统日记文件路径失败:', error);
				}
			}
		
			// 如果没有扩展名，默认使用.md
			if (!targetFilePath.endsWith('.md')) {
				targetFilePath += '.md';
			}
		
			// 3. 读取目标文件内容
			let targetFileContent = '';
			if (await this.app.vault.adapter.exists(targetFilePath)) {
				targetFileContent = await this.app.vault.adapter.read(targetFilePath);
			}
			// console.log(`[TaskAI] 即将写入文件: ${targetFileContent}`);

			// 4. 准备附加内容
			let additionalContent = '';
			if (query.includeCurrentTime) {
				const now = new Date();
				const timeString = now.toLocaleString('zh-CN');
				additionalContent += `\n\n当前时间：${timeString}`;
			}
			if (query.includeTaskInfo) {
				// 读取任务集文件夹中的所有md文件内容
				const taskFolderPath = this.settings.taskCollectionsFolder;
				if (await this.app.vault.adapter.exists(taskFolderPath)) {
					const taskFiles = (await this.app.vault.adapter.list(taskFolderPath)).files.filter(file => file.endsWith('.md'));
					let allTaskContent = '';
					for (const file of taskFiles) {
						// 使用list返回的完整路径，避免路径重复
						const content = await this.app.vault.adapter.read(file);
						// 仅使用文件名显示，不显示完整路径
						const fileName = file.split('/').pop();
						allTaskContent += `\n\n=== ${fileName} ===\n${content}`;
					}
					additionalContent += `\n\n任务信息：${allTaskContent}`;
				}
			}
			// 5. 向AI发送请求并流式写入响应
			const finalContent = `${targetFileContent}`;
			await this.app.vault.adapter.write(targetFilePath, finalContent);
			
			// 获取AI响应并直接写入文件
			let aiResponse = await this.sendTimedQueryToAI(promptContent, targetFileContent + additionalContent);
			if (aiResponse) {
				await this.app.vault.adapter.append(targetFilePath, aiResponse);
			}

			// 如果Flomo集成已启用且API Key已设置，将结果发送到Flomo
			if (this.settings.isFlomoEnabled && this.settings.flomoApiKey) {
				await this.sendToFlomo(aiResponse);
			}

			new Notice(`Timed task executed: ${query.time}.`);
		} catch (error) {
			console.error('Error executing timed query:', error);
			new Notice(`Timed task execution failed: ${query.time}`);
		} finally {
			// 设置生成状态为完成
			this.isTriggerGenerating = false;
			
			// 处理队列中的下一个查询
			this.processNextTrigger();
		}
	}
		

	
	// 处理队列中的下一个触发式生成
	private async processNextTrigger() {
		if (this.triggerQueue.length > 0) {
			const nextQuery = this.triggerQueue.shift();
			if (nextQuery) {
				await this.executeTimedQuery(nextQuery);
			}
		}
	}

	// 将内容发送到Flomo
	private async sendToFlomo(content: string) {
		try {
			const flomoApiUrl = this.settings.flomoApiKey;
			// 检查URL格式是否正确
			if (!flomoApiUrl.startsWith('https://flomoapp.com/iwh/')) {
				new Notice('Flomo API URL format is incorrect.');
				return;
			}
			const response = await requestUrl({
				url: flomoApiUrl,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ content })
			});

			if (response.status === 200) {
				// console.log('Flomo发送成功');
				new Notice('Send Flomo Success');
			} else {
				let errorMsg = `HTTP错误 ${response.status}`;
				try {
					const errorData = await response.json();
					errorMsg += `: ${JSON.stringify(errorData)}`;
					console.error('Flomo发送失败:', errorMsg);
				} catch (e) {
					// 如果响应不是JSON，获取原始文本
					const errorText = response.text;
					errorMsg += `: ${errorText.substring(0, 100)}...`; // 只显示前100个字符
					console.error('Flomo发送失败:', errorMsg);
				}
				new Notice('Send Flomo Failed');
			}
		} catch (error) {
			console.error('Flomo发送失败:', error);
			new Notice('Send Flomo Failed');
		}
	}

	private async sendTimedQueryToAI(prompt: string, content: string): Promise<string> {
		if (!this.settings.deepseekApiKey) {
			throw new Error('Deepseek API Key not set');
		}

		const messages = [
			{ role: 'system', content: prompt },
			{ role: 'user', content: `请分析以下内容：\n\n${content}` }
		];
		// console.log(`[TaskAI] 向AI发送请求: ${JSON.stringify(messages)}`);

		// 为每次自动问询生成唯一ID
		const uniqueRequestId = this.generateSessionId();

		// 存储完整的AI响应内容
		let fullResponse = '';

		// 先尝试使用非流式请求（更符合requestUrl的使用方式）
		try {
			const response = await requestUrl({
				url: 'https://api.deepseek.com/v1/chat/completions',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.settings.deepseekApiKey}`
				},
				body: JSON.stringify({
					model: this.settings.deepseekModel,
					messages: messages,
					temperature: 0.7,
					top_p: 0.95,
					stream: false, // 使用非流式请求
					user: uniqueRequestId
				})
			});
			// console.log(`[TaskAI] 从AI接收非流式响应: ${response.text}`);

			// 处理非流式响应
			if (response.status === 200 && response.text) {
				try {
					const data = JSON.parse(response.text);
					if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
						fullResponse = data.choices[0].message.content;
					}
				} catch (parseError) {
					console.error('Error parsing non-stream response:', parseError);
					// 如果非流式解析失败，尝试作为流式数据处理
					fullResponse = this.parseStreamData(response.text);
				}
			} else {
				console.error(`API request failed with status: ${response.status}`);
				// 如果请求失败且有响应内容，尝试解析
				if (response.text) {
					fullResponse = this.parseStreamData(response.text);
				}
			}
		} catch (error) {
			console.error('Error in API request:', error);
			// 再次尝试使用流式请求作为备选方案
			try {
				const response = await requestUrl({
					url: 'https://api.deepseek.com/v1/chat/completions',
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${this.settings.deepseekApiKey}`
					},
					body: JSON.stringify({
						model: this.settings.deepseekModel,
						messages: messages,
						temperature: 0.7,
						top_p: 0.95,
						stream: true,
						user: uniqueRequestId
					})
				});

				if (response.text) {
					fullResponse = this.parseStreamData(response.text);
				}
			} catch (streamError) {
				console.error('Stream request also failed:', streamError);
				throw new Error('Failed to get response from AI API');
			}
		}

		return fullResponse;
	}

	// 辅助方法：解析流式响应数据
	private parseStreamData(text: string): string {
		let fullContent = '';
		const lines = text.split('\n').filter(line => line.trim());

		for (const line of lines) {
			if (line.startsWith('data: ')) {
				const jsonStr = line.slice(6);
				if (jsonStr === '[DONE]') {
					break;
				}
				try {
					const data = JSON.parse(jsonStr);
					// 支持不同格式的响应结构
					if (data.choices && data.choices[0]) {
						// 流式响应格式
						if (data.choices[0].delta && data.choices[0].delta.content) {
							fullContent += data.choices[0].delta.content;
						}
						// 完整响应格式
						else if (data.choices[0].message && data.choices[0].message.content) {
							fullContent += data.choices[0].message.content;
						}
					}
				} catch (error) {
					console.error('Error parsing stream data line:', error);
					// 忽略解析错误，继续处理下一行
				}
			}
		}

		return fullContent;
	}

	// private async createDefaultPromptFile(): Promise<boolean> {
	// 	const filePath = this.settings.defaultPromptFile;
	// 	// console.log(`[TaskAI] Checking file: ${filePath}`);
	// 	const exists = await this.app.vault.adapter.exists(filePath);
	// 	// console.log(`[TaskAI] File ${filePath} exists: ${exists}`);
	// 	if (!exists) {
	// 		// 默认提示词内容
	// 		const defaultContent = `你是一个任务管理与事项分析的专家，请协助我进行分析。`;
	// 		await this.app.vault.create(filePath, defaultContent);
	// 		console.log(`[TaskAI] Created default prompt file: ${filePath}`);
	// 		return true;
	// 	}
	// 	return false;
	// }

	public async getDailyNotesConfigFromFile(): Promise<DailyConfig['daily-notes'] | null> {
		try {
			// config 文件的路径
			const configPath = '.obsidian/config';

			// 检查文件是否存在
			if (!await this.app.vault.adapter.exists(configPath)) {
				console.error('config 文件不存在');
				return null;
			}

			// 读取文件内容
			const configContent = await this.app.vault.adapter.read(configPath);

			// 解析 JSON
			const config: DailyConfig = JSON.parse(configContent);

			// 返回日记插件的配置
			return config['daily-notes'] || null;

		} 
		catch (error) {
			console.error('读取或解析 config 文件失败:', error);
			return null;
		}
		
	}

	public settings: TaskAISettings = DEFAULT_SETTINGS;

	
}
