import { get, post, uploadFile } from './base'
import service from './request'

// ----- 老师端接口 -----

// 上传课程资源
export const uploadCourseResourceApi = (
  data: FormData
) => uploadFile("/api/resource/course/upload", data)

// 查询老师课程资源列表
export const getTeacherCourseResourceListApi = (courseId: number) => 
  get(`/api/resource/course/list`, { courseId })

// 发布课程资源
export const publishCourseResourceApi = (data: {
  resourceId: number
  courseId: number
  allowPreview?: boolean
  allowDownload?: boolean
  remark?: string
}) => post("/api/resource/course/publish", data)

// 撤回课程资源
export const revokeCourseResourceApi = (data: {
  resourceId: number
  courseId: number
  remark?: string
}) => post("/api/resource/course/revoke", data)

// 获取老师资源预览地址
export const getTeacherPreviewUrlApi = (resourceId: number) => 
  get(`/api/resource/course/preview-url`, { resourceId })

// 删除资源
export const deleteResourceApi = (resourceId: number) => 
  service.delete(`/api/resource/delete?resourceId=${resourceId}`)

// ----- 学生端接口 -----

// 查询学生可见课程资源列表
export const getStudentCourseResourceListApi = (courseId: number) => 
  get(`/api/resource/student/course/list`, { courseId })

// 获取学生资源预览地址
export const getStudentPreviewUrlApi = (resourceId: number) => 
  get(`/api/resource/student/preview-url`, { resourceId })

// ----- 下载 URL 拼接方式，因为是文件流，也可直接走 window.open -----

export const getTeacherDownloadUrl = (resourceId: number, token: string) => {
  const globalConfig = (window as any).GLOBAL_CONFIG || {};
  const baseURL = globalConfig.API_BASE_URL || '/smartclassroom';
  return `${baseURL}/api/resource/course/download?resourceId=${resourceId}&token=${token}`
}

export const getStudentDownloadUrl = (resourceId: number, token: string) => {
  const globalConfig = (window as any).GLOBAL_CONFIG || {};
  const baseURL = globalConfig.API_BASE_URL || '/smartclassroom';
  return `${baseURL}/api/resource/student/download?resourceId=${resourceId}&token=${token}`
}
