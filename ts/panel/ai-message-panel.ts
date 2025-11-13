import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import AutoTaskPanelWithAI from './main';
import { AIMessage } from './types';

export class AIMessagePanel extends ItemView {
  plugin: AutoTaskPanelWithAI;

  constructor(leaf: WorkspaceLeaf, plugin: AutoTaskPanelWithAI) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return "ai-message-panel";
  }

  getDisplayText(): string {
    return "AI消息面板";
  }

  getIcon(): string {
    return "message-square";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();

    // 创建消息面板标题
    const title = container.createEl("h2", { text: "AI消息面板" });
    title.className = "ai-message-panel-title";

    // 创建消息列表容器
    const messagesContainer = container.createEl("div", { cls: "ai-messages-container" });
    messagesContainer.id = "ai-messages-container";

    // 创建用户输入容器
    const inputContainer = container.createEl("div", { cls: "ai-message-input-container" });

    // 创建文本输入框
    const inputText = inputContainer.createEl("textarea", {
      cls: "ai-message-input",
      placeholder: "输入问题或请求..."
    });

    // 创建发送按钮
    const sendBtn = inputContainer.createEl("button", { text: "发送" });
    sendBtn.className = "ai-message-send-btn";

    // 添加发送按钮点击事件
    sendBtn.addEventListener("click", () => {
      const message = inputText.value.trim();
      if (message) {
        this.onUserInput(message);
        inputText.value = "";
      }
    });

    // 添加回车键发送功能
    inputText.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const message = inputText.value.trim();
        if (message) {
          this.onUserInput(message);
          inputText.value = "";
        }
      }
    });

    // 渲染历史消息
    this.renderMessages();
  }

  async onClose() {
    // 清理资源
  }

  // 渲染消息列表
  private renderMessages() {
    const messagesContainer = document.getElementById("ai-messages-container");
    if (!messagesContainer) return;

    messagesContainer.empty();

    // 显示历史消息
    for (const message of this.plugin.settings.aiMessageHistory) {
      this.addMessageToDisplay(message.text, message.sender);
    }
  }

  // 将消息添加到显示中
  private addMessageToDisplay(text: string, sender: "user" | "ai") {
    const messagesContainer = document.getElementById("ai-messages-container");
    if (!messagesContainer) return;

    const messageElement = messagesContainer.createEl("div", {
      cls: `ai-message ${sender}`
    });

    const messageContent = messageElement.createEl("div", {
      cls: "ai-message-content"
    });

    messageContent.innerHTML = text;

    // 滚动到最新消息
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // 处理用户输入
  private onUserInput(text: string) {
    // 将用户消息添加到显示中
    this.addMessageToDisplay(text, "user");

    // 将用户消息保存到历史记录
    this.plugin.settings.aiMessageHistory.push({
      text,
      sender: "user",
      timestamp: Date.now()
    });
    this.plugin.saveSettings();

    // 生成AI回复
    // 调用插件的 AI 响应生成逻辑（请确保 main.ts 中已实现对应方法或替换为实际调用）
    (this.plugin as any).generateAIResponse?.(text);
  }

  // 处理生成的AI消息
  onMessageGenerated(text: string) {
    // 将AI消息添加到显示中
    this.addMessageToDisplay(text, "ai");

    // 将AI消息保存到历史记录
    this.plugin.settings.aiMessageHistory.push({
      text,
      sender: "ai",
      timestamp: Date.now()
    });
    this.plugin.saveSettings();
  }
}
