// import { App, ItemView, WorkspaceLeaf, MarkdownRenderer } from 'obsidian';

// export const VIEW_TYPE_AI_MESSAGE = 'ai-message-panel';

// export class AI_Message_Panel extends ItemView {
// 	private panel: HTMLElement;

// 	constructor(leaf: WorkspaceLeaf) {
// 		super(leaf);
// 		this.panel = this.contentEl;
// 	}

// 	// 实现ItemView的required方法
// 	getViewType(): string {
// 		return VIEW_TYPE_AI_MESSAGE;
// 	}

// 	getDisplayText(): string {
// 		return 'Message';
// 	}

// 	getIcon(): string {
// 		// 使用Obsidian内置的compass图标
// 		return 'compass';
// 	}

// 	// 修改createPanel方法，将面板结构挂载到this.contentEl上
// 	async onOpen(): Promise<void> {
// 		this.panel = this.contentEl;
// 		this.panel.id = 'ai-message-panel';
// 		this.panel.className = 'ai-message-panel';

// 		// 创建面板头部
// 		const header = document.createElement('div');
// 		header.className = 'ai-message-panel-header';
// 		header.innerHTML = `<h3>AI 消息面板</h3>`;

// 		// 创建会话ID显示元素
// 		const sessionIdElement = document.createElement('div');
// 		sessionIdElement.className = 'ai-session-id';
// 		sessionIdElement.textContent = '会话ID：空';
// 		// header.appendChild(sessionIdElement);
		
// 		// 触发面板打开事件，通知插件更新会话ID
// 		(this.app as any).workspace.trigger('taskai:panel-opened', this);

// 		// 创建新会话按钮
// 		const newSessionBtn = document.createElement('button');
// 		newSessionBtn.id = 'new-session-btn';
// 		newSessionBtn.setAttribute('data-tooltip', '开启新会话');
// 		newSessionBtn.setAttribute('data-tooltip-position', 'top');
// 		newSessionBtn.className = 'has-tooltip';
// 		newSessionBtn.textContent = '转到新会话';
// 		newSessionBtn.addEventListener('click', () => {
// 			// 发送新会话事件到插件（使用类型断言解决TypeScript类型检查）
// 			(this.app.workspace as any).trigger('taskai:new-session');
// 		});
// 		header.appendChild(newSessionBtn);

// 		// 创建消息容器
// 		const messageContainer = document.createElement('div');
// 		messageContainer.className = 'ai-message-container';

// 		// // 创建输入区域
// 		// const inputArea = document.createElement('div');
// 		// inputArea.className = 'ai-message-input-area';
// 		// inputArea.innerHTML = `
// 		// 	<textarea id="ai-message-input" placeholder="请输入您的问题或指令..."></textarea>
// 		// 	<button id="ai-message-send">发送</button>
// 		// 	<button id="ai-message-copy">复制</button>
// 		// `;

// 		// 组合面板内容
// 		this.panel.appendChild(header);
// 		this.panel.appendChild(messageContainer);
// 		// this.panel.appendChild(inputArea);

// 		// 添加事件监听
// 		this.addEventListeners(this.panel);
// 	}

// 	async onClose(): Promise<void> {
// 		// 清理工作
// 	}

// 	// 移除旧的appendPanelToDOM方法，ItemView会自动处理DOM附加

// 	private addEventListeners(panel: HTMLElement) {
// 		// 移除旧的关闭按钮事件，因为ItemView有自己的关闭机制
// 		// const closeButton = panel.querySelector('#ai-message-panel-close');
// 		// if (closeButton) {
// 		// 	closeButton.addEventListener('click', () => this.close());
// 		// }

// 		// 发送按钮事件
// 		const sendButton = panel.querySelector('#ai-message-send');
// 		if (sendButton) {
// 			sendButton.addEventListener('click', () => this.send());
// 		}

// 		// 输入区域回车事件
// 		const input = panel.querySelector('#ai-message-input') as HTMLTextAreaElement;
// 		if (input) {
// 			input.addEventListener('keydown', (e) => {
// 				if (e.key === 'Enter' && e.ctrlKey) {
// 					this.send();
// 				}
// 			});
// 		}

// 		// 复制按钮事件
// 		const copyButton = panel.querySelector('#ai-message-copy');
// 		if (copyButton) {
// 			copyButton.addEventListener('click', () => this.copy());
// 		}
// 	}

// 	// 移除旧的open、close、toggle、removePanel方法，ItemView已实现这些功能
// 	// public open() {
// 	// 	this.panel.style.display = 'block';
// 	// 	this.isOpen = true;
// 	// }
// 	// 
// 	// public close() {
// 	// 	this.panel.style.display = 'none';
// 	// 	this.isOpen = false;
// 	// }
// 	// 
// 	// public toggle() {
// 	// 	if (this.isOpen) {
// 	// 		this.close();
// 	// 	} else {
// 	// 		this.open();
// 	// 	}
// 	// }
// 	// 
// 	// public removePanel() {
// 	// 	if (this.panel.parentNode) {
// 	// 		this.panel.parentNode.removeChild(this.panel);
// 	// 		console.log('AI Message Panel removed from DOM');
// 	// 	}
// 	// }

// 	private send() {
// 		// 发送消息逻辑
// 		const input = this.panel.querySelector('#ai-message-input') as HTMLTextAreaElement;
// 		const message = input.value.trim();
// 		if (message) {
// 			// 清空输入框
// 			input.value = '';
// 			// 添加用户消息到容器
// 			this.addMessageToContainer(message, 'user');
// 			// 模拟AI响应
// 			setTimeout(() => {
// 				this.addMessageToContainer('这是一个模拟的AI响应。', 'ai');
// 			}, 1000);
// 		}
// 	}

// 	private copy() {
// 		// 复制消息逻辑
// 		const messageContainer = this.panel.querySelector('.ai-message-container');
// 		if (messageContainer) {
// 			const messages = messageContainer.querySelectorAll('.ai-message');
// 			let text = '';
// 			messages.forEach(msg => {
// 				text += msg.textContent || '';
// 				text += '\n';
// 			});
// 			navigator.clipboard.writeText(text).then(() => {
// 				// 可以添加复制成功提示
// 				// console.log('复制成功');
// 			});
// 		}
// 	}

// 	public async addMessageToContainer(message: string, type: 'user' | 'ai'): Promise<HTMLElement | null> {
// 		const messageContainer = this.panel.querySelector('.ai-message-container');
// 		if (messageContainer) {
// 			const messageElement = document.createElement('div');
// 			messageElement.className = `ai-message ai-message-${type}`;
			
// 			if (type === 'ai') {
// 				// 为AI消息添加复制按钮
// 				messageElement.innerHTML = `
// 					<div class="ai-message-content">
// 						<div class="ai-message-markdown"></div>
// 					</div>
// 					<button class="ai-message-copy-btn" title="复制回复">
// 						<!-- 复制图标 -->
// 						<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
// 					</button>
// 				`;
				
// 				// 渲染Markdown内容
// 				const markdownContainer = messageElement.querySelector('.ai-message-markdown') as HTMLElement;
// 				if (markdownContainer) {
// 					await MarkdownRenderer.render(this.app, message, markdownContainer, '', this);
// 					// 保存原始Markdown到消息元素属性
// 					messageElement.setAttribute('data-md-content', message);
// 				}
				
// 				// 添加复制按钮点击事件
// 				const copyBtn = messageElement.querySelector('.ai-message-copy-btn') as HTMLButtonElement;
// 				copyBtn.addEventListener('click', () => {
// 					const content = messageElement.querySelector('.ai-message-markdown')?.textContent || '';
// 					navigator.clipboard.writeText(content).then(() => {
// 						// 可以添加复制成功的视觉反馈
// 						copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-check"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
// 						// 2秒后恢复原始图标
// 						setTimeout(() => {
// 							copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
// 						}, 2000);
// 					}).catch(err => {
// 						console.error('复制失败:', err);
// 					});
// 				});
// 			} else {
// 				// 用户消息保持原样
// 				messageElement.innerHTML = `<p>${message}</p>`;
// 			}
			
// 			messageContainer.appendChild(messageElement);
// 			// 滚动到底部
// 			messageContainer.scrollTop = messageContainer.scrollHeight;
// 			return messageElement;
// 		}
// 		return null;
// 	}

// 	// 创建空的AI消息元素
// 	public async createEmptyAIMessage(): Promise<HTMLElement | null> {
// 		const messageContainer = this.panel.querySelector('.ai-message-container');
// 		if (messageContainer) {
// 			const messageElement = document.createElement('div');
// 			messageElement.className = `ai-message ai-message-ai`;
// 			messageElement.innerHTML = `
// 				<div class="ai-message-content">
// 					<div class="ai-message-markdown">
// 						<div class="ai-message-loading">
// 							AI 思考中 <span class="ai-loading-spinner">|</span>
// 						</div>
// 					</div>
// 				</div>
// 				<button class="ai-message-copy-btn" title="复制回复">
// 					<!-- 复制图标 -->
// 					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
// 				</button>
// 			`;
// 			messageContainer.appendChild(messageElement);
// 			// 滚动到底部
// 			messageContainer.scrollTop = messageContainer.scrollHeight;
			
// 			// 启动加载动画
// 			const spinner = messageElement.querySelector('.ai-loading-spinner') as HTMLElement;
// 			if (spinner) {
// 				const spinnerChars = ['|', '/', '-', '\\'];
// 				let index = 0;
// 				const intervalId = setInterval(() => {
// 					index = (index + 1) % spinnerChars.length;
// 					spinner.textContent = spinnerChars[index];
// 				}, 200);
// 				// 将定时器ID存储在消息元素上以便后续清除
// 				(messageElement as any).loadingIntervalId = intervalId;
// 			}
			
// 			return messageElement;
// 		}
// 		return null;
// 	}

// 	// 流式更新消息内容
// 	public async updateMessageElement(messageElement: HTMLElement, newContent: string) {
// 		const markdownContainer = messageElement.querySelector('.ai-message-markdown') as HTMLElement;
// 		const pElement = messageElement.querySelector('p');
		
// 		// 清除加载动画
// 		const loadingIntervalId = (messageElement as any).loadingIntervalId;
// 		if (loadingIntervalId) {
// 			clearInterval(loadingIntervalId);
// 			delete (messageElement as any).loadingIntervalId;
// 		}
		
// 		if (markdownContainer) {
// 			// 如果是AI消息且已经有markdown容器
// 			// 从消息元素属性获取当前累积的Markdown内容
// 			let currentMdContent = messageElement.getAttribute('data-md-content') || '';
// 			// 追加新的Markdown内容
// 			const fullMdContent = currentMdContent + newContent;
// 			// 更新消息元素属性
// 			messageElement.setAttribute('data-md-content', fullMdContent);
// 			// 清空容器并使用完整的Markdown内容重新渲染
// 			markdownContainer.innerHTML = '';
// 			await MarkdownRenderer.render(this.app, fullMdContent, markdownContainer, '', this);
// 		} else if (pElement) {
// 			// 如果是用户消息或旧格式的AI消息
// 			pElement.innerHTML += newContent;
// 		}
		
// 		// 滚动到底部
// 		const messageContainer = this.panel.querySelector('.ai-message-container');
// 		if (messageContainer) {
// 			messageContainer.scrollTop = messageContainer.scrollHeight;
// 		}
// 	}

// 	// 更新会话ID显示
// 	public updateSessionId(sessionId: string) {
// 		const sessionIdElement = this.panel.querySelector('.ai-session-id');
// 		if (sessionIdElement) {
// 			sessionIdElement.textContent = `会话ID：${sessionId}`;
// 		}
// 	}

// 	// 为新会话添加分隔线
// 	public addSessionSeparator(): void {
// 		const messageContainer = this.panel.querySelector('.ai-message-container');
// 		if (messageContainer) {
// 			const children = Array.from(messageContainer.children);
// 			const lastChild = children[children.length - 1];
			
// 			// 检查是否有子元素且最后一个子元素是消息
// 			if (lastChild && lastChild.classList.contains('ai-message')) {
// 				// 创建并添加分隔线
// 				const separator = document.createElement('div');
// 				separator.className = 'ai-message-separator';
// 				messageContainer.appendChild(separator);
// 			}
// 		}
// 	}
// }
