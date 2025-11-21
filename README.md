- 更新声明：这个插件所使用的 **语言将以中文为主** 、并且暂时只会使用 Deepseek 的解释模型。如果时间充裕，我会根据社区反馈进行调整。
- 这个插件针对我这样不习惯使用类似 Task 那样严格定义的语法的人所设计，通过 AI 自动化的列举每日需完成的事项。
- 在使用所有功能前，你需要注册一个 Deepseek 开放平台账号，获取到 API Key，并充值一定的金额。传送门：[Deepseek 开放平台](https://platform.deepseek.com/register)
- 主要功能：触发式生成。此功能可以根据你设置的定时任务，自动读取任务集文件夹发送向 AI 让其进行任务整合，将结果写入当天的日记文件中。
	- 此外，如果你拥有 flomo 平台会员，你可以在插件设置中配置 flomo API ，使插件在触发式生成后，自动将结果发送到 flomo 平台，方便你在手机端查看。
- 辅助功能：持续性与 AI 进行对话，并以时间戳形式保存对话记录。通过指令开启发送消息的模态框，以选定的提示词文件向AI进行持续询问。

## 自动创建适应的文件夹结构
- 在插件打开或库打开时，这些文件结构会自动创建，你可以指定其他文件结构用于替代它们
- 仅有设置为任务集内的任务会被发送向 AI 进行处理
```
_Root/plugin/Task-AI/
_Root/plugin/Task-AI/prompts/
_Root/plugin/Task-AI/prompts/default.md
_Root/plugin/Task-AI/history/
Task-AI 任务集/
```

## AI 配置
- 以下功能需要你有 Deepseek api ，并且使用思考模式模型 `deepseek-reasoner` 。
	- 我对 AI 的使用策略相对保守，因此在我设计的插件中 AI 不参与决策和对内容含义的实质修改。它仅用于 **提炼整合信息** 和 **替代难以设计以适应不同需求的格式化工具** 。
	- 但考虑到可能有需求，我依旧给出了自由质询的功能以供使用。
	- 我对任务安排类信息的隐私需求度不高，可以接受其被上传到服务器，如果你有顾虑的话，请不要使用这个功能。

## 触发式生成
- 此功能可以根据你设置的定时任务，自动读取任务集文件夹发送向 AI 让其进行任务整合，将结果写入当天的日记文件中。
    - 需要开启 obsidian 的日记插件以写入 AI 生成信息
- 在配置 flomo API 后，可以自动将生成内容发送到你的 Flomo 中，以便移动端查看。
- 由于 AI 协作，你可以不需要费力设计或记忆标签系统，尤其是关于重复性周期性的时间标签。
	- **使用 AI 协作，你可以以自然语言形式** 自由编辑时间、项目等区别标签而不需要去注重格式。
	- 例如，你希望每月第二个周末进行一次大清扫，如果使用正常时间标签，就我的经验而言，这很难设计，更难使用，甚至会因为太过抽象而遗忘标准。使用 AI ，你将不需要费时间记忆那些格式，以你自己觉得能够说清的方式来说就可以。

# English README
- Updated statement: This is the **language general and Chinese literature main**, and the Deepseek solution model used at the time. We will continue to improve our own needs and fulfill our own needs, fill our time, and adjust our society's progress.
- The purpose of this design is to use the following: Tasks that are specific to the language, generally consistent with AI deep thinking, and automated sequentially to complete each day's needs.
- Before using the function, you need to pay attention to one Deepseek open platform purchase number, get the API key, and charge the fixed price. ＠Shipping Gate: [Deepseek Opening Platform](https://platform.deepseek.com/register)
- Main ability: Tactile generation. This function can be used to set up a fixed time assignment, auto-manage assignment assignment collection, and send an AI review of its operations and assignment assignments, and copy the future results into the current daily record. 
- Outside of this, if you have a flomo flat board, you can use the flomo API to create an item, and after generating the message, the driver can send the result to the flomo flat board, and it is convenient to view the terminal.
- Helping function: Keep the AI ​​running, save the format from time to time. If you want to open a message and send a message, please select the selected text and continue reading the AI.

## Automobile construction option text structure
- When opening or editing existing articles, we may automatically construct the article structure, or you may designate another article structure for use as a substitute.
- You have set up your own assignments for internal assignments for AI operations.
````
_Root/plugin/Task-AI/
_Root/plugin/Task-AI/prompts/
_Root/plugin/Task-AI/prompts/default.md
_Root/plugin/Task-AI/history/
Task-AI task collection/
````

## AI placement
- The following functions are required by Deepseek api , and use the thinking model `deepseek-reasoner`. 
- We maintain the same strategy used by AI, so we have revised the actual performance of the AI, including the content of the strategy we designed. **Provide matching information** **Alternatives may be designed to suit different requirements for formalization tools**. 
- However, if there is a demand for it, it is possible to use it for free. 
- We are responsible for the exclusion of information due to private demand, which may be accepted or delivered to you, if you have any questions, or if you do not need to use the service.

## Tactile generation
- This feature allows you to set up your own fixed time assignments, auto-manage your assignments, and send them to AI in order to coordinate your work, and copy the future results into the current daily record. 
- Demand opening obsidian's daily record and copying AI generated information
- After locating Flomo API, you can send the information to Flomo, then check the transfer end.
- Yuyu AI fabrication, you can design or record memory without any additional costs, which means that you can design the periodic time. 
- **Use AI fabrication，You can use natural language form** Freely set the time, item etc. can be separated and not required. 
- For example, if you wish to move forward at the end of the second month of each month, you will be able to use the normal time designation, write your own words, further design, change usage, and the result will be abstracted and forgotten. Use AI, you don't have to worry about the cost of time, so you can understand it yourself.
