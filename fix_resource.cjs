const fs = require('fs');
let s = fs.readFileSync('src/api/resource.ts', 'utf-8');
const search = 'export const deleteResourceApi';
let idx = s.indexOf(search);
if (idx !== -1) {
  let endIdx = s.indexOf('// -----', idx);
  let before = s.substring(0, endIdx);
  let after = s.substring(endIdx);
  let newApi = `// ----- 分页接口 -----
export const getResourcePageApi = (params: { pageNo?: number; pageSize?: number; bizType?: string; bizId?: number }) =>
  get('/api/resource/page', params)

export const getTeacherCourseResourcePageApi = (params: { courseId: number; pageNo?: number; pageSize?: number }) =>
  get('/api/resource/course/page', params)

export const getStudentCourseResourcePageApi = (params: { courseId: number; pageNo?: number; pageSize?: number }) =>
  get('/api/resource/student/course/page', params)

`;
  fs.writeFileSync('src/api/resource.ts', before + newApi + after);
} else {
  console.log('not found');
}
