const fs = require('fs');

const filePath = 'src/views/DashboardView.vue';
let content = fs.readFileSync(filePath, 'utf-8');

const searchLoadResources = `const loadResources = async () => {`;
const newLoadResources = `const resourcePage = ref(1)
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
  }`;

const originalLoadResourcesStr = `const loadResources = async () => {
    if (activeMenu.value !== 'file-public' && activeMenu.value !== 'file-private') return
  
    loadingFiles.value = true
  
    try {
      // 1. 如果是老师访问"私密资料"
      if (isTeacher.value && activeMenu.value === 'file-private') {
        const courseId = 1 // 根据你的假数据，通常班级ID如 1
        const res = await getTeacherCourseResourceListApi(courseId) as any
        if (res.code === 0) {
          privateFiles.value = res.data || []
        }
      }
      // 2. 对于公开文件，如果当前登录是老师，应当调用老师接口拿发布过的列表
      else if (isTeacher.value && activeMenu.value === 'file-public') {
         const courseId = 1
         const res = await getTeacherCourseResourceListApi(courseId) as any
         if (res.code === 0) {
           // 根据后端的定义，已发布的才相当于"所有学生可见"，老师端可以在这里自己过滤
         publicFiles.value = (res.data || []).filter((item: any) => item.publishStatus === 'PUBLISHED')
         }
      }
      // 3. 如果当前登录是学生，访问公开资料
      else {
        const courseId = 1
        const res = await getStudentCourseResourceListApi(courseId) as any
        if (res.code === 0) {
        publicFiles.value = res.data || []
        }
      }
    } catch (error: any) {
      console.error('获取资源列表报错:', error)
      // ElMessage.error('Failed to sync file data')
    } finally {
      loadingFiles.value = false
    }
  }`;

content = content.replace(originalLoadResourcesStr.replace(/\r\n/g, '\n'), newLoadResources);

const watcherStr = `watch(activeMenu, (newVal) => {
    if (newVal === 'file-public' || newVal === 'file-private') {
      resourcePage.value = 1;
      loadResources()
    }
  })`;
content = content.replace(/watch\(activeMenu,\s*\(newVal\)\s*=>\s*\{\s*if\s*\(([^)]+)\)\s*\{\s*loadResources\(\)\s*\}\s*\}\)/g, watcherStr);

let template1 = `            </el-table>`;
let templateReplace1 = `            </el-table>
            <div style="margin-top: 15px; display: flex; justify-content: flex-end">
              <el-pagination
                v-model:current-page="resourcePage"
                v-model:page-size="resourcePageSize"
                :page-sizes="[10, 20, 50, 100]"
                layout="total, sizes, prev, pager, next, jumper"
                :total="resourceTotal"
                @size-change="handleResourceSizeChange"
                @current-change="handleResourcePageChange"
              />
            </div>`;
// Just do it carefully.
content = content.replace(/<\/el-table>\s*<\/div>\s*<\/div>\s*<\/div>\s*<!-- file-private /g, templateReplace1 + `\n          </div>\n        </div>\n      </div>\n\n      <!-- file-private `);

content = content.replace(/<\/el-table>\s*<\/div>\s*<\/div>\s*<\/div>\s*<!-- /g, templateReplace1 + `\n          </div>\n        </div>\n      </div>\n\n      <!-- `);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Update Script Completed.');

