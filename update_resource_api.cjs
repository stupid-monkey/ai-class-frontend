const fs = require('fs');

const filePath = 'src/api/resource.ts';
let content = fs.readFileSync(filePath, 'utf-8');

const newApis = `export const getResourcePageApi = (params: { pageNo?: number; pageSize?: number; bizType?: string; bizId?: number }) => {
  const query = new URLSearchParams()
  if (params.pageNo) query.append('pageNo', String(params.pageNo))
  if (params.pageSize) query.append('pageSize', String(params.pageSize))
  if (params.bizType) query.append('bizType', params.bizType)
  if (params.bizId) query.append('bizId', String(params.bizId))
  return get('/api/resource/page?' + query.toString())
}

export const getTeacherCourseResourcePageApi = (params: { courseId: number; pageNo?: number; pageSize?: number }) => {
  const query = new URLSearchParams()
  query.append('courseId', String(params.courseId))
  if (params.pageNo) query.append('pageNo', String(params.pageNo))
  if (params.pageSize) query.append('pageSize', String(params.pageSize))
  return get('/api/resource/course/page?' + query.toString())
}

export const getStudentCourseResourcePageApi = (params: { courseId: number; pageNo?: number; pageSize?: number }) => {
  const query = new URLSearchParams()
  query.append('courseId', String(params.courseId))
  if (params.pageNo) query.append('pageNo', String(params.pageNo))
  if (params.pageSize) query.append('pageSize', String(params.pageSize))
  return get('/api/resource/student/course/page?' + query.toString())
}`;

const oldApis = `export const getResourcePageApi = (params: { pageNo?: number; pageSize?: number; bizType?: string; bizId?: number }) =>
  get('/api/resource/page', params)

export const getTeacherCourseResourcePageApi = (params: { courseId: number; pageNo?: number; pageSize?: number }) =>
  get('/api/resource/course/page', params)

export const getStudentCourseResourcePageApi = (params: { courseId: number; pageNo?: number; pageSize?: number }) =>
  get('/api/resource/student/course/page', params)`;

content = content.replace(oldApis.replace(/\r\n/g, '\n'), newApis);
fs.writeFileSync(filePath, content, 'utf-8');
console.log('resource.ts updated');
