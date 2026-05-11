const fs = require('fs');

const filePath = 'src/views/DashboardView.vue';
let content = fs.readFileSync(filePath, 'utf-8');

const startIdx = content.indexOf('const loadResources = async () => {');
const watcherIdx = content.indexOf('watch(activeMenu, (newVal) => {');
const endIdx = content.indexOf('})', watcherIdx) + 2;

if (startIdx !== -1 && endIdx !== -1) {
  let before = content.substring(0, startIdx);
  let after = content.substring(endIdx);
  let insert = `const resourcePage = ref(1)
const resourcePageSize = ref(10)
const resourceTotal = ref(0)

const handleResourcePageChange = (val: number) => {
  resourcePage.value = val;
  loadResources();
}

const handleResourceSizeChange = (val: number) => {
  resourcePageSize.value = val;
  resourcePage.value = 1;
  loadResources();
}

const loadResources = async () => {
  if (activeMenu.value !== 'file-public' && activeMenu.value !== 'file-private') return

  loadingFiles.value = true

  try {
    if (isTeacher.value && activeMenu.value === 'file-private') {
      const res = await getResourcePageApi({
        pageNo: resourcePage.value,
        pageSize: resourcePageSize.value,
        bizType: 'COURSE_RESOURCE'
      }) as any
      if (res.code === 0) {
        privateFiles.value = res.data.records || []
        resourceTotal.value = res.data.total || 0
      }
    }
    else if (isTeacher.value && activeMenu.value === 'file-public') {
        const courseId = 1
        const res = await getTeacherCourseResourcePageApi({
          courseId,
          pageNo: resourcePage.value,
          pageSize: resourcePageSize.value
        }) as any
        if (res.code === 0) {
          publicFiles.value = res.data.records || []
          resourceTotal.value = res.data.total || 0
        }
    }
    else {
      const courseId = 1
      const res = await getStudentCourseResourcePageApi({
        courseId,
        pageNo: resourcePage.value,
        pageSize: resourcePageSize.value
      }) as any
      if (res.code === 0) {
        publicFiles.value = res.data.records || []
        resourceTotal.value = res.data.total || 0
      }
    }
  } catch (error: any) {
    console.error('获取资源列表报错:', error)
  } finally {
    loadingFiles.value = false
  }
}

watch(activeMenu, (newVal) => {
  if (newVal === 'file-public' || newVal === 'file-private') {
    resourcePage.value = 1;
    loadResources()
  }
})`;

  content = before + insert + after;
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Logic updated.');
}
