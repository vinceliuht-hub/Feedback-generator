
import { GoogleGenAI } from "@google/genai";
import { ClassroomNotes } from "../types";

const SYSTEM_INSTRUCTION = `你是一位专业的英语老师，擅长与家长沟通。
请根据用户输入的【课堂笔记】，为家长生成一份结构清晰、语气亲切但专业的课后反馈。

【特别要求】
- 严禁在输出中使用任何 Markdown 格式符号（如 **、*、__、# 等）。
- 请直接使用纯文本配合 Emoji 进行排版。
- 开场白：请直接使用我提供的问候语开始，严禁添加“XX家长”或“我是英语老师”等字样。
- 🌟 课堂表现部分：请重点参考老师填写的“课堂闪光点”，用赞赏且具体的口吻描述学生的进步和亮点。
- ⚠️ 提分关键 (重点) 部分：必须以老师输入的“出问题的部分”为核心。输入的英文术语、单词或短语必须原封不动地保留，不得强制翻译。在保留原文基础上可进行专业化的逻辑梳理和语气润色。

必须严格遵循以下格式：
1. 问候语（直接开始，例如：上午好！）。
2. 📚 本节课重点内容：概括总结本节课学习的核心知识点（如重点词汇、语法结构或课文核心）。
3. 🌟 课堂表现：根据老师提供的闪光点，具体描述学生在课堂上的积极表现和进步。
4. ⚠️ 提分关键 (重点)：归纳点出的问题，用大白话解释。确保保留老师原始输入中的所有英文表达。
5. 📝 课后作业：罗列条目。
6. 排版：分段清晰，语气要积极、有建设性。

请直接输出反馈内容，不要包含任何多余的解释。`;

export const generateFeedback = async (notes: ClassroomNotes, greeting: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
  问候语：${greeting}！
  【课堂笔记】
  学生姓名：${notes.studentName}
  课堂内容：${notes.classContent}
  课堂闪光点：${notes.highlights}
  出问题的部分/待提高点（保留里面的英文）：${notes.improvementAreas}
  课后作业：${notes.homework}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      },
    });

    let text = response.text || "未能生成反馈，请稍后重试。";
    
    // 彻底移除可能残余的 Markdown 符号
    text = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/__/g, '').replace(/#/g, '');

    return text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("生成反馈时发生错误，请检查网络连接。");
  }
};
