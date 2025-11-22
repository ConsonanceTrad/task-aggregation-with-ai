- 更新声明：这个插件暂时只会使用 Deepseek 的解释模型。如果时间充裕，我会根据社区反馈进行调整。
- 这个插件针对我这样不习惯使用类似 Task 那样严格定义的语法的人所设计，通过 AI 自动化的列举每日需完成的事项。
	- 最大的好处是：你可以同时体验到 **无需恪守标签格式** 的编辑自由与自动化工具的精准 **待办事项整合协助**
- 在使用所有功能前，你需要注册一个 Deepseek 开放平台账号，获取到 API Key，并充值一定的金额。传送门：[Deepseek 开放平台](https://platform.deepseek.com/register)
- 主要功能：触发式生成。此功能可以根据你设置的定时任务，自动读取任务集文件夹发送向 AI 让其进行任务整合，将结果写入当天的日记文件中。
	- 此外，如果你拥有 flomo 平台会员，你可以在插件设置中配置 flomo API ，使插件在触发式生成后，自动将结果发送到 flomo 平台，方便你在手机端查看。
- 在插件打开或库打开时会自动创建一个文件夹 `Task Box` ，用于限定向 AI 发送任务集范围，你可以指定其他文件结构用于替代它

## 触发式生成
- 因为要将数据上传到 Deepseek 服务器，所以适合任务安排类信息的隐私需求度不高、可以接受其被上传到服务器的工作。如果你有相关顾虑，请不要使用这个功能。

### 前置配置
- 此功能需要你有 Deepseek API
	- 插件中 AI 不参与任务集文件夹（默认为 Time Box）中文件的实质修改。 AI 生产的内容会被写入核心插件指定的日记文件中。
- 需要开启 obsidian 的 **核心插件日记** 以写入 AI 生成信息。
- 在配置 Flomo API 后，可以自动将生成内容发送到你的 Flomo 中，以便移动端查看。

### 功能简介
- 此功能可以根据你设置的定时任务，自动读取任务集文件夹发送向 AI 让其进行任务整合，将结果写入当天的日记文件中。
- 可供替换的提示词文件夹，你可以指定一个文件夹以添加自定义的提示词。
- 由于 AI 协作，你可以不需要费力设计或记忆标签系统，尤其是关于重复性周期性的时间标签。
	- **使用 AI 协作，你可以以自然语言形式** 自由编辑时间、项目等区别标签而不需要去注重格式。
	- 例如，你希望每月第二个周末进行一次大清扫，如果使用正常时间标签，就我的经验而言，这很难设计，更难使用，甚至会因为太过抽象而遗忘标准。使用 AI ，你将不需要费时间记忆那些格式，以你自己觉得能够说清的方式来说就可以。

# English README (Machine translation)
- Update Notice: This plugin will currently only use Deepseek's interpretation model. I will adjust it based on community feedback if time permits.

- This plugin is designed for people like me who are not used to strictly defined syntax like Tasks. It uses AI to automatically list daily tasks.

- Before using all features, you need to register a Deepseek Open Platform account, obtain an API Key, and deposit a certain amount of money. Link: [Deepseek Open Platform](https://platform.deepseek.com/register)

- Main Feature: Triggered Generation. This feature can automatically read the task set folder based on your scheduled tasks and send it to the AI ​​for task integration, writing the results to the daily log file.
	- Additionally, if you have a flomo platform membership, you can configure the flomo API in the plugin settings so that the plugin automatically sends the results to the flomo platform after triggered generation, making it convenient for you to view on your mobile device.
- Folder `Task Box` will be automatically created when the plugin or library is opened. This folder is used to limit the scope of the task set sent to the AI. You can specify other file structures to replace it.

## Triggered Generation

- Because data needs to be uploaded to the Deepseek server, this is suitable for tasks with low privacy requirements and where uploading to the server is acceptable. If you have related concerns, please do not use this feature.

### Prerequisite Configuration

- The following features require the Deepseek API:
	- The AI ​​in the plugin does not participate in any substantial modification of files in the task set folder (default is Time Box). AI-generated content is written to a diary file specified by the core plugin.

- Requires enabling the **core plugin diary** in obsidian to write AI-generated information.

- After configuring the Flomo API, generated content can be automatically sent to your Flomo for viewing on mobile devices.

### Feature Overview

- This feature automatically reads the task set folder based on your scheduled tasks and sends it to the AI ​​for task integration, writing the results to the daily log file.

- Replaceable cue word folders: You can specify a folder to add custom cue words.

- Thanks to AI collaboration, you don't need to painstakingly design or memorize tagging systems, especially for repetitive or periodic time tags.
	- **With AI collaboration, you can freely edit time, project, and other distinguishing tags in natural language** without worrying about formatting.
	- For example, if you want to do a thorough cleaning on the second weekend of each month, using normal time tags, in my experience, is difficult to design, even more difficult to use, and may even lead to forgetting the standards due to their abstract nature. With AI, you won't need to spend time memorizing those formats; you can simply express it in a way that you find clear.