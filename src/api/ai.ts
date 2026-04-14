import { get, post } from './base'
import service from './request'

/**
 * AI 普通问答聊天
 * @param message 用户输入消息
 * @param history 历史消息数组
 */
export const aiChatApi = (data: {
  message: string
  history?: Array<{ role: string; content: string }>
}) => post("/api/ai/chat", data)

/**
 * AI 流式聊天（SSE）
 * @param message 用户输入消息
 * @param history 历史消息数组
 * 返回 EventSource，需手动处理 SSE 事件
 */
export const aiStreamChatApi = (data: {
  message: string
  history?: Array<{ role: string; content: string }>
}) => {
  const baseURL = localStorage.getItem('baseURL') || '/smartclassroom'
  const token = localStorage.getItem('token')
  
  // 构建请求体
  const queryString = new URLSearchParams({
    message: data.message,
    history: JSON.stringify(data.history || [])
  }).toString()
  
  const url = `${baseURL}/api/ai/chat/stream`
  const eventSource = new EventSource(url, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  } as any)
  
  return eventSource
}

/**
 * AI 流式聊天（改进版，使用 fetch + ReadableStream）
 * @param data 包含 message 和 history
 * @param onData 数据回调函数，接收 (event: string, data: any)
 * @param onError 错误回调函数
 */
export const aiStreamChatFetch = async (
  data: {
    message: string
    history?: Array<{ role: string; content: string }>
  },
  onData: (event: string, data: any) => void,
  onError: (error: any) => void
) => {
  const token = localStorage.getItem('token')
  const globalConfig = (window as any).GLOBAL_CONFIG || {}
  const baseURL = globalConfig.API_BASE_URL || '/smartclassroom'
  
  console.log('【API调试】流式聊天请求配置:', {
    url: `${baseURL}/api/ai/chat/stream`,
    token: token ? '已设置' : '未设置',
    data: data
  })
  
  // 创建AbortController用于超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30秒超时
  
  try {
    const response = await fetch(`${baseURL}/api/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(data),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    console.log('【API调试】响应Status:', response.status, response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('【API调试】响应错误:', errorText)
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`)
    }
    
    const contentType = response.headers.get('content-type') || ''
    console.log('【API调试】响应类型:', contentType)
    
    // 如果是普通JSON响应，直接处理
    if (contentType.includes('application/json')) {
      const jsonData = await response.json()
      console.log('【API调试】JSON响应:', jsonData)
      onData('done', { reply: jsonData.data?.reply || jsonData.reply || JSON.stringify(jsonData) })
      return
    }
    
    // 流式响应处理
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }
    
    const decoder = new TextDecoder()
    let buffer = ''
    let hasReceivedData = false
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        console.log('【API调试】流式传输完成')
        break
      }
      
      hasReceivedData = true
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      
      // 保留最后可能不完整的行
      buffer = lines.length > 0 ? (lines[lines.length - 1] || '') : ''
      
      // 处理所有完整的行
      const completeLines = lines.slice(0, -1)
      for (const line of completeLines) {
        if (line.startsWith('event: ')) {
          const eventType = line.slice(7).trim()
          console.log('【API调试】SSE事件类型:', eventType)
        } else if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim()
          try {
            const jsonData = JSON.parse(dataStr)
            console.log('【API调试】SSE数据:', jsonData)
            onData('delta', jsonData)
          } catch (e) {
            // 如果不是JSON，当作普通文本处理
            if (dataStr && dataStr !== '[DONE]') {
              onData('delta', { content: dataStr })
            }
          }
        }
      }
    }
    
    if (!hasReceivedData) {
      console.warn('【API调试】未收到任何数据')
      onData('done', { reply: '暂无回复' })
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      console.error('【API调试】请求超时')
      onError(new Error('请求超时，请检查后端服务是否正常运行'))
    } else {
      console.error('【API调试】流式聊天错误:', error)
      onError(error)
    }
  }
}

/**
 * AI 智能出题
 * @param data 包含知识点、难度等级、题型、题目数量等参数的请求体
 */
export const aiGenerateHomeworkApi = (data: FormData | {
  knowledge: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionTypes: ('choice' | 'judge')[]
  questionCount: number
  prompt?: string
}) => {
  // 当 data 为 FormData 时，不能手动设置 Content-Type，否则会丢失 boundary
  const config = data instanceof FormData 
    ? undefined 
    : { headers: { 'Content-Type': 'application/json' } };
  return service.post("/api/ai/homework/generate", data, config).then(res => res as any)
}

/**
 * AI 生成 PPT 大纲
 * @param topic 主questions
 * @param pages 页数
 * @param style 风格
 */
export const aiGeneratePPTOutlineApi = (data: {
  topic: string
  pages?: number
  style?: string
}) => post("/api/ai/ppt/generate", data)

/**
 * 获取发布对象（班级和学生列表）
 * 用于前端"发布作业"弹窗加载班级和学生选择列表
 */
export const getHomeworkPublishTargetsApi = () => get("/api/homework/publish-targets")

/**
 * 发布作业
 * @param data 作业数据
 */
export const publishHomeworkApi = (data: {
  knowledge: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionTypes: string[]
  content?: Array<any>
  questionCount?: number
  studentIds?: number[]
  classIds?: number[]
}) => post("/api/homework/publish", data)

/**
 * 获取作业列表
 */
export const getHomeworkListApi = () => get("/api/homework/list")

/**
 * 获取教师已发布作业提交总览（包含所有学生的提交Status分类）
 * 返回数据包含：assignments、pendingAssignments、submittedAssignments、reviewedAssignments
 */
export const getTeacherPublishedHomeworkApi = () => get("/api/homework/teacher/published")

/**
 * 获取作业详情
 * @param homeworkId 作业 ID
 */
export const getHomeworkDetailApi = (homeworkId: number) => 
  get(`/api/homework/${homeworkId}`)

/**
 * 学生提交作业
 * @param homeworkId 作业 ID
 * @param answers 答questions数据
 * @param note 备注
 */
export const submitHomeworkApi = (
  homeworkId: number,
  data: {
    answers: Array<{ questionIndex: number; answer: string }>
    note?: string
  }
) => post(`/api/homework/${homeworkId}/submit`, data)

/**
 * 教师批改作业
 * @param homeworkId 作业 ID
 * @param studentId 学生 ID
 * @param score 分数
 * @param feedback 反馈
 */
export const reviewHomeworkApi = (
  homeworkId: number,
  data: {
    studentId: number
    reviewMode?: 'manual' | 'ai'
    score?: number
    feedback?: string
  }
) => post(`/api/homework/${homeworkId}/review`, data)

/**
 * 获取教师的班级列表
 */
export const getTeacherClassesApi = () => get("/api/teacher/classes")

/**
 * 获取班级内的学生列表
 * @param classId 班级 ID
 */
export const getClassStudentsApi = (classId: number) => 
  get(`/api/teacher/classes/${classId}/students`)

/**
 * 创建 PPT 任务（智能生成 PPT）
 * @param data PPT 任务参数 FormData 包含 file, prompt, pages, style
 */
export const createPPTTaskApi = (data: FormData) => 
  post("/api/smart-aippt/generate", data as any)

/**
 * 查询 PPT 任务Status（按本地记录 ID）
 * @param recordId 本地记录 ID
 */
export const getPPTTaskByIdApi = (recordId: number) => 
  get(`/api/smart-aippt/tasks/${recordId}`)

/**
 * 查询 PPT 状态（按远端任务 ID）
 * @param taskId 远端任务 ID
 */
export const getPPTTaskByRemoteIdApi = (taskId: string) => 
  get(`/api/smart-aippt/tasks/remote/${taskId}`)

/**
 * 创建 Gamma PPT 任务（智能生成 PPT）
 * @param data PPT 任务参数 FormData 包含 file, prompt, pages, style
 */
export const createGammaPPTTaskApi = (data: FormData) => 
  post("/api/smart-aippt/generate/gamma", data as any)

