<template>
  <el-container class="dashboard-container">
    <el-aside width="240px" class="sidebar">
      <div class="logo">🚀 AI 课堂控制台</div>
      
      <div class="role-switch">
        <span>当前身份: </span>
        <el-tag :type="isTeacher ? 'primary' : 'success'" style="cursor: default;" size="large">
          {{ isTeacher ? '👨‍🏫 教师' : '👨‍🎓 学生' }}
        </el-tag>
        <div v-if="userStore.userInfo" style="margin-top: 8px; font-size: 12px; color: #409EFF;">
          当前登录: {{ userStore.userInfo.name }} (ID: {{ userStore.userInfo.id }})
        </div>
      </div>

      <el-menu 
        :default-active="activeMenu" 
        :default-openeds="['ai-group', 'file-group']"
        @select="handleSelectMenu" 
        class="side-menu"
      >
        <el-sub-menu index="ai-group">
          <template #title>
            <span> AI 课堂助手</span>
          </template>
          <el-menu-item index="ai-qa">AI 问答</el-menu-item>
          <el-menu-item index="ai-ppt" v-if="isTeacher"> PPT 生成</el-menu-item>
          <el-menu-item index="ai-homework" v-if="isTeacher"> 课堂作业（出题）</el-menu-item>
          <el-menu-item index="teacher-grading" v-if="isTeacher"> 作业批改</el-menu-item>
          <el-menu-item index="student-homework" v-if="!isTeacher"> 我的作业</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="file-group">
          <template #title>
            <span> 文件资料</span>
          </template>
          <el-menu-item index="file-public"> 公开文件资料</el-menu-item>
          <el-menu-item index="file-private" v-if="isTeacher"> 教师个人资料</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="top-header">
        <span class="page-title">{{ pageTitle }}</span>
        <div style="display: flex; gap: 10px; align-items: center;">
          <el-dropdown trigger="click" @command="handleUserMenuCommand">
            <span style="font-size: 12px; color: #909399; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              {{ userStore.userInfo?.name }}
              <el-icon style="font-size: 12px;"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="changePassword">🔐 修改密码</el-dropdown-item>
                <el-dropdown-divider />
                <el-dropdown-item command="logout">🚪 退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="main-content">
        
        <!-- AI 问答 -->
        <div v-if="activeMenu === 'ai-qa'" class="page-section qa-container">
          <div class="chat-window" ref="chatWindowRef">
            <div v-for="(msg, index) in chatList" :key="index" :class="['chat-msg', msg.role === 'user' ? 'user' : 'ai']">
              <div class="avatar">{{ msg.role === 'user' ? '我' : 'AI' }}</div>
              <div class="msg-bubble">{{ msg.content }}</div>
            </div>
          </div>
          <div class="input-area">
            <el-input 
              v-model="inputMsg" 
              placeholder="向 AI 提问任何关于课程、知识点的问题..." 
              size="large"
              @keyup.enter="!chatLoading && sendMessage()"
              :disabled="chatLoading"
            >
              <template #append>
                <el-button 
                  type="primary" 
                  @click="sendMessage"
                  :loading="chatLoading"
                  :disabled="chatLoading"
                >
                  {{ chatLoading ? '思考中...' : '发送' }}
                </el-button>
              </template>
            </el-input>
          </div>
        </div>

        <!-- PPT 生成 -->
        <div v-if="activeMenu === 'ai-ppt' && isTeacher" class="page-section">
          <el-card shadow="never">
            <el-row :gutter="40">
              <el-col :span="8">
                <el-form label-position="top">
                  <el-form-item label="PPT 主题/大纲">
                    <el-input v-model="pptForm.topic" type="textarea" :rows="4" placeholder="例如：高中物理《牛顿第二定律》教学课件..." />
                  </el-form-item>
                  <el-form-item label="期望页数">
                    <el-slider v-model="pptForm.pages" :min="5" :max="30" show-input />
                  </el-form-item>
                  <el-form-item label="设计风格">
                    <el-select v-model="pptForm.style" placeholder="选择风格" style="width: 100%;">
                      <el-option label="学术简约" value="simple" />
                      <el-option label="活泼卡通" value="cartoon" />
                      <el-option label="科技炫酷" value="tech" />
                    </el-select>
                  </el-form-item>
                  <el-button 
                    type="primary" 
                    size="large" 
                    style="width: 100%; margin-top: 10px;"
                    @click="generatePPT"
                    :loading="pptLoading"
                    :disabled="pptLoading"
                  >
                    {{ pptLoading ? '⏳ 正在生成中...' : '🚀 一键生成 PPT' }}
                  </el-button>
                </el-form>
              </el-col>
              <el-col :span="16">
                <!-- 生成成功结果展示 -->
                <div v-if="pptResultUrl" class="preview-box" style="background-color: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #e1f3d8; height: 100%; display: flex; flex-direction: column;">
                  <div style="margin-bottom: 10px; padding: 15px; background: #f0f9eb; border-radius: 4px;">
                    <div style="color: #67C23A; font-size: 18px; font-weight: bold; margin-bottom: 8px;">
                      <el-icon><CircleCheckFilled /></el-icon> PPT 生成成功！
                    </div>
                    <div style="font-size: 14px; color: #606266; margin-bottom: 15px;">
                      您的 PPT 已经准备就绪。由于网络安全限制，部分内网生成文件（如本地 9000 端口）无法直接通过外部 Office 服务预览，如果下方预览框出错呈现 "An error occurred"，请直接点击下载按钮在本地打开预览。
                    </div>
                    <div style="display: flex; gap: 10px;">
                      <a :href="pptResultUrl" target="_blank" style="text-decoration: none;">
                        <el-button type="success" size="large"><el-icon style="margin-right: 4px"><Download /></el-icon>直接下载 PPT</el-button>
                      </a>
                    </div>
                  </div>
                  <!-- 使用微软 Office Online 预览 -->
                  <div style="flex-grow: 1; border: 1px solid #dcdfe6; position: relative;">
                    <iframe 
                      v-if="pptPreviewUrl"
                      :src="`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(pptPreviewUrl)}`" 
                      width="100%" 
                      height="100%" 
                      style="min-height: 500px;" 
                      frameborder="0">
                    </iframe>
                  </div>
                </div>

                <!-- 处理中状态 -->
                <div v-else-if="pptTaskStatus === 'PROCESSING' || pptTaskStatus === 'SUBMITTED'" class="preview-box" style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 400px;">
                  <el-result icon="info" title="PPT 生成状态">
                     <template #sub-title>
                        <div style="display:flex; flex-direction: column; align-items: center; gap: 10px;">
                           <el-icon class="is-loading" :size="30"><Loading /></el-icon>
                           <span>{{ pptTaskStatus === 'PROCESSING' ? 'AI 正在分析大纲构思页面 (这可能需要几分钟)...' : '任务已推送到远端生成队列，请耐心等待...' }}</span>
                        </div>
                     </template>
                  </el-result>
                </div>

                <!-- 大纲展示 -->
                <div v-else-if="pptOutline" class="preview-box" style="background-color: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #dcdfe6; overflow-y: auto;">
                  <div style="margin-bottom: 10px; color: #409EFF; font-weight: bold;">📄 PPT 大纲预览 ({{ pptPagesCount }} 页)</div>
                  <el-text style="white-space: pre-wrap;">{{ pptOutline }}</el-text>
                </div>

                <div v-else class="preview-box">
                  <el-empty description="暂无预览，请先在左侧输入信息并生成" />
                </div>
              </el-col>
            </el-row>
          </el-card>
        </div>

        <!-- 课堂作业 -->
        <div v-if="activeMenu === 'ai-homework'" class="page-section">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-card shadow="never">
                <template #header>
                  <span style="font-weight: bold;">✨ AI 智能出题</span>
                </template>
                <el-form label-position="top">
                  <el-form-item label="考察知识点">
                    <el-input 
                      v-model="hwForm.knowledge" 
                      type="textarea" 
                      :rows="3" 
                      placeholder="例如：唐诗三百首、李白生平..." 
                    />
                  </el-form-item>
                  <el-form-item label="题目难度">
                    <el-radio-group v-model="hwForm.difficulty">
                      <el-radio-button label="easy">简单</el-radio-button>
                      <el-radio-button label="medium">中等</el-radio-button>
                      <el-radio-button label="hard">困难</el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item label="题型包含">
                    <el-checkbox-group v-model="hwForm.types">
                      <el-checkbox label="choice">选择题</el-checkbox>
                      <el-checkbox label="judge">判断题</el-checkbox>
                    </el-checkbox-group>
                  </el-form-item>
                  <el-form-item label="题目数量">
                    <el-input-number 
                      v-model="hwForm.questionCount" 
                      :min="1" 
                      :max="20" 
                    />
                  </el-form-item>
                  <el-button 
                    type="success" 
                    style="width: 100%"
                    size="large"
                    @click="generateHomework"
                    :loading="hwLoading"
                    :disabled="hwLoading"
                  >
                    {{ hwLoading ? `⏳ 正在处理 (${hwLoadingTime}s)` : '💡 智能出题' }}
                  </el-button>
                </el-form>
              </el-card>
            </el-col>
            <el-col :span="16">
              <el-card shadow="hover">
                <template #header>
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span>生成的作业预览 ({{ hwGeneratedQuestions.length }} 题)</span>
                    <el-button 
                      type="primary" 
                      @click="publishHomework"
                      :loading="hwPublishing"
                      :disabled="hwGeneratedQuestions.length === 0 || hwPublishing"
                    >
                      {{ hwPublishing ? '发布中...' : '📤 发布作业' }}
                    </el-button>
                  </div>
                </template>
                <div v-if="hwGeneratedQuestions.length === 0" style="text-align: center; padding: 40px;">
                  <el-empty description="暂无题目，请先在左侧生成题目" />
                </div>
                <div v-else class="hw-content">
                  <div v-for="(question, idx) in hwGeneratedQuestions" :key="idx" class="hw-question">
                    <div class="question-header">
                      <span class="question-no">{{ idx + 1 }}</span>
                      <span class="question-type">{{ question.type === 'choice' ? '选择题' : '判断题' }}</span>
                    </div>
                    <div class="question-text">{{ question.question }}</div>
                    <div v-if="question.options && question.options.length" class="options">
                      <div v-for="(option, oIdx) in question.options" :key="oIdx" class="option">
                        {{ option }}
                      </div>
                    </div>
                    <div class="answer"><strong>答案:</strong> {{ question.answer }}</div>
                    <div v-if="question.explanation" class="explanation"><strong>解析:</strong> {{ question.explanation }}</div>
                    <el-divider />
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <!-- 教师批改 - 列表 -->
        <div v-if="activeMenu === 'teacher-grading' && isTeacher" class="page-section" style="padding: 0; background-color: transparent; box-shadow: none;">
          <TeacherHomeworkListView :in-dashboard="true" @grade="handleGrade" />
        </div>

        <!-- 教师批改 - 详情 -->
        <div v-if="activeMenu === 'teacher-grading-detail' && isTeacher" class="page-section" style="padding: 0; background-color: transparent; box-shadow: none;">
          <TeacherGradingView 
            :in-dashboard="true" 
            :homework-id="currentGradingData.homeworkId" 
            :student-id="currentGradingData.studentId" 
            @back="activeMenu = 'teacher-grading'" 
          />
        </div>

        <!-- 学生作业 - 列表 -->
        <div v-if="activeMenu === 'student-homework' && !isTeacher" class="page-section" style="padding: 0; background-color: transparent; box-shadow: none;">
          <StudentHomeworkView :in-dashboard="true" @detail="handleStudentHomeworkDetail" />
        </div>

        <!-- 学生作业 - 详情 -->
        <div v-if="activeMenu === 'student-homework-detail' && !isTeacher" class="page-section" style="padding: 0; background-color: transparent; box-shadow: none;">
          <HomeworkDetailView 
            :in-dashboard="true" 
            :assignment-id="currentStudentHomeworkData.homeworkId" 
            @back="activeMenu = 'student-homework'" 
          />
        </div>

        <!-- 文件资料 - 公开 -->
        <div v-if="activeMenu === 'file-public'" class="page-section">
          <el-card shadow="never">
            <template #header>
              <div style="display: flex; justify-content: space-between;">
                <span>全班共享的学习资料（所有人可见）</span>
              </div>
            </template>
            <el-table :data="publicFiles" border style="width: 100%" v-loading="loadingFiles">
              <el-table-column prop="originalFilename" label="文件名" />
              <el-table-column prop="category" label="分类" width="120" />
              <el-table-column prop="publishTime" label="发布日期" width="180" />
              <el-table-column label="操作" width="140">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="previewFile(row)">预览</el-button>
                  <el-button link type="primary" size="small" @click="downloadFile(row)" v-if="row.allowDownload !== false" :loading="downloadingIds.includes(row.resourceId)" :disabled="downloadingIds.includes(row.resourceId)">下载</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>

        <!-- 文件资料 - 私密 -->
        <div v-if="activeMenu === 'file-private' && isTeacher" class="page-section">
          <el-card shadow="never" style="background-color: #fafafa;">
            <template #header>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #F56C6C; font-weight: bold;">我的课程资源（包含全部已上传文件）</span>
                <el-button type="primary" size="small" @click="openUploadDialog">上传新资料</el-button>
              </div>
            </template>
            <el-table :data="privateFiles" border style="width: 100%" v-loading="loadingFiles">
              <el-table-column prop="originalFilename" label="资源名称" />
              <el-table-column prop="category" label="分类" width="100" />
              <el-table-column label="发布状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.publishStatus === 'PUBLISHED' ? 'success' : (row.publishStatus === 'REVOKED' ? 'danger' : 'info')">
                    {{ row.publishStatus === 'PUBLISHED' ? '已发布' : (row.publishStatus === 'REVOKED' ? '已撤回' : '未发布') }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" label="创建日期" width="160" />
              <el-table-column label="操作" width="240" fixed="right">
                <template #default="{ row }">
                  <el-button link type="primary" size="small" @click="previewFile(row)">预览</el-button>
                  <el-button link type="primary" size="small" @click="downloadFile(row)" :loading="downloadingIds.includes(row.resourceId)" :disabled="downloadingIds.includes(row.resourceId)">下载</el-button>
                  <el-button link type="success" size="small" v-if="row.publishStatus !== 'PUBLISHED'" @click="publishFile(row)">发布</el-button>
                  <el-button link type="warning" size="small" v-if="row.publishStatus === 'PUBLISHED'" @click="revokeFile(row)">撤回</el-button>
                  <el-button link type="danger" size="small" @click="deleteFile(row)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>

      </el-main>
    </el-container>
  </el-container>

  <!-- 作业发布对话框 - 班级和学生选择 -->
  <el-dialog 
    v-model="hwPublishDialogVisible" 
    title="📤 选择发布对象" 
    width="500px"
    align-center
  >
    <div style="max-height: 400px; overflow-y: auto;">
      <!-- 班级选择 -->
      <div style="margin-bottom: 20px;">
        <p style="font-weight: bold; margin-bottom: 10px;">📚 选择班级（可多选）:</p>
        <el-checkbox-group v-model="selectedClasses" style="display: flex; flex-direction: column; gap: 8px;">
          <el-checkbox 
            v-for="cls in availableClasses" 
            :key="cls.id" 
            :label="cls.id"
            style="width: 100%;"
          >
            <span style="margin-left: 8px;">
              {{ cls.name }} <el-tag :type="'info'" size="small">{{ cls.studentCount }} 人</el-tag>
            </span>
          </el-checkbox>
        </el-checkbox-group>
      </div>

      <el-divider />

      <!-- 学生选择 -->
      <div>
        <p style="font-weight: bold; margin-bottom: 10px;">👨‍🎓 选择学生（可多选）:</p>
        <el-checkbox-group v-model="selectedStudents" style="display: flex; flex-direction: column; gap: 8px;">
          <el-checkbox 
            v-for="student in availableStudents" 
            :key="student.id" 
            :label="student.id"
            style="width: 100%;"
          >
            <span style="margin-left: 8px;">
              {{ student.name }} 
              <el-tag :type="'success'" size="small">{{ student.className }}</el-tag>
            </span>
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="hwPublishDialogVisible = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="confirmPublishHomework"
          :loading="hwPublishing"
          :disabled="hwPublishing"
        >
          确认发布
        </el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 上传资源对话框 -->
  <el-dialog
    v-model="uploadDialogVisible"
    title="📤 上传课程资源"
    width="500px"
    @closed="handleUploadDialogClose"
  >
    <el-form label-position="top">
      <el-form-item label="选择文件" required>
         <el-upload
            class="upload-demo"
            drag
            action="#"
            :auto-upload="false"
            :on-change="onFileChange"
            :file-list="fileList"
            :limit="1"
          >
            <el-icon class="el-icon--upload"><Document /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或 <em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                单文件不超过 100MB
              </div>
            </template>
          </el-upload>
      </el-form-item>
      <el-form-item label="所属课程 ID" required>
        <el-input v-model="uploadCourseId" placeholder="例如：1001" type="number" />
      </el-form-item>
      <el-form-item label="可见性">
        <el-select v-model="uploadVisibility" style="width: 100%;">
          <el-option label="全班 (CLASS)" value="CLASS" />
          <el-option label="私密 (PRIVATE)" value="PRIVATE" />
        </el-select>
      </el-form-item>
      <el-form-item label="备注说明">
        <el-input v-model="uploadRemark" placeholder="选填，资源备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="uploadDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmUploadResource" :loading="uploadingFile">确认上传</el-button>
    </template>
  </el-dialog>

</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { logoutApi } from '@/api/log'
import { useUserStore } from '@/stores/user'
import { ArrowDown, Loading, Download, CircleCheckFilled, Document } from '@element-plus/icons-vue'
import { aiChatApi, aiGenerateHomeworkApi, publishHomeworkApi, aiGeneratePPTOutlineApi, getHomeworkPublishTargetsApi, createPPTTaskApi, getPPTTaskByIdApi } from '@/api/ai'
import {
  uploadCourseResourceApi,
  getTeacherCourseResourceListApi,
  publishCourseResourceApi,
  revokeCourseResourceApi,
  getTeacherPreviewUrlApi,
  deleteResourceApi,
  getStudentCourseResourceListApi,
  getStudentPreviewUrlApi,
  getTeacherDownloadUrl,
  getStudentDownloadUrl
} from '@/api/resource'

import TeacherHomeworkListView from './TeacherHomeworkListView.vue'
import TeacherGradingView from './TeacherGradingView.vue'
import StudentHomeworkView from './StudentHomeworkView.vue'
import HomeworkDetailView from './HomeworkDetailView.vue'

const currentGradingData = ref({ homeworkId: '', studentId: '' })
const currentStudentHomeworkData = ref({ homeworkId: '' })

const handleGrade = (assignment: any) => {
  currentGradingData.value = { 
    homeworkId: assignment.homeworkId?.toString(), 
    studentId: assignment.studentId?.toString() 
  }
  activeMenu.value = 'teacher-grading-detail'
}

const handleStudentHomeworkDetail = (homeworkId: string) => {
  currentStudentHomeworkData.value = { homeworkId: homeworkId?.toString() }
  activeMenu.value = 'student-homework-detail'
}

const router = useRouter()
const userStore = useUserStore()

// 基础状态
const activeMenu = ref('ai-qa')
const isLoading = ref(false)

// 从 store 获取当前登录用户的角色
const isTeacher = computed(() => userStore.isTeacher)

// 安全拦截：学生不能访问教师专属菜单
watch(isTeacher, (newVal) => {
  if (!newVal) {
    if (activeMenu.value === 'file-private') activeMenu.value = 'file-public'
    if (activeMenu.value === 'ai-ppt') activeMenu.value = 'ai-qa'
    if (activeMenu.value === 'teacher-grading') activeMenu.value = 'ai-qa'
  }
})

onMounted(async () => {
  if (!userStore.isLoggedIn) {
    userStore.initFromLocalStorage()
  }
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  
  // 尝试从 sessionStorage 恢复之前的工作状态
  console.log('【调试】尝试恢复之前的工作状态')
  const savedHwForm = sessionStorage.getItem('dashboardHwForm')
  const savedHwQuestions = sessionStorage.getItem('dashboardHwQuestions')
  const savedPptForm = sessionStorage.getItem('dashboardPptForm')
  const savedPptOutline = sessionStorage.getItem('dashboardPptOutline')
  const savedPptTaskId = sessionStorage.getItem('dashboardPptTaskId')
  const savedActiveMenu = sessionStorage.getItem('dashboardActiveMenu')
  
  if (savedHwForm) {
    try {
      Object.assign(hwForm, JSON.parse(savedHwForm))
      console.log('【调试】已恢复作业表单状态')
    } catch (e) {
      console.error('恢复作业表单失败:', e)
    }
  }
  
  if (savedHwQuestions) {
    try {
      hwGeneratedQuestions.value = JSON.parse(savedHwQuestions)
      console.log('【调试】已恢复生成的题目列表')
    } catch (e) {
      console.error('恢复题目列表失败:', e)
    }
  }
  
  if (savedPptForm) {
    try {
      Object.assign(pptForm, JSON.parse(savedPptForm))
      console.log('【调试】已恢复 PPT 表单状态')
    } catch (e) {
      console.error('恢复 PPT 表单失败:', e)
    }
  }
  
  if (savedPptOutline) {
    pptOutline.value = savedPptOutline
    console.log('【调试】已恢复 PPT 大纲')
  }
  
  if (savedPptTaskId) {
    pptTaskId.value = parseInt(savedPptTaskId)
    console.log('【调试】已恢复 PPT 任务 ID')
  }
  
  if (savedActiveMenu) {
    activeMenu.value = savedActiveMenu
    console.log('【调试】已恢复当前菜单:', savedActiveMenu)
  }
  
  // 教师登录后加载班级和学生列表
  if (isTeacher.value) {
    try {
      console.log('【调试】从后端加载发布对象列表')
      const response = await getHomeworkPublishTargetsApi() as any
      
      if (response.code === 0 && response.data) {
        const data = response.data
        console.log('【调试】发布对象接口返回:', data)
        
        // 转换班级数据: {classId, className, studentCount} -> {id, name, studentCount}
        availableClasses.value = (data.classes || []).map((cls: any) => ({
          id: cls.classId,
          name: cls.className,
          studentCount: cls.studentCount || 0,
          code: cls.classCode
        }))
        console.log('【调试】班级列表:', availableClasses.value)
        
        // 转换学生数据: {studentId, studentName, classIds, classNames} -> {id, name, className}
        availableStudents.value = (data.students || []).map((student: any) => ({
          id: student.studentId,
          name: student.studentName,
          username: student.username,
          className: student.classNames && student.classNames.length > 0 ? student.classNames[0] : '未分配班级',
          classIds: student.classIds
        }))
        console.log('【调试】学生列表:', availableStudents.value)
      } else {
        console.warn('【调试】获取发布对象失败，使用示例数据')
        // 回退到示例数据
        useExampleData()
      }
    } catch (error: any) {
      console.error('【调试】加载发布对象失败:', error)
      ElMessage.warning('加载班级和学生信息失败，已使用示例数据')
      // 回退到示例数据
      useExampleData()
    }
  }
  
  // 监听状态变化，自动保存到 sessionStorage
  watch([hwForm, hwGeneratedQuestions, pptForm, pptOutline, pptTaskId, activeMenu], 
    ([newHwForm, newHwQuestions, newPptForm, newPptOutline, newPptTaskId, newActiveMenu]) => {
      try {
        // 保存作业表单
        sessionStorage.setItem('dashboardHwForm', JSON.stringify(newHwForm))
        // 保存生成的题目
        sessionStorage.setItem('dashboardHwQuestions', JSON.stringify(newHwQuestions))
        // 保存 PPT 表单
        sessionStorage.setItem('dashboardPptForm', JSON.stringify(newPptForm))
        // 保存 PPT 大纲
        sessionStorage.setItem('dashboardPptOutline', newPptOutline)
        // 保存 PPT 任务 ID
        if (newPptTaskId) {
          sessionStorage.setItem('dashboardPptTaskId', newPptTaskId.toString())
        }
        // 保存当前菜单
        sessionStorage.setItem('dashboardActiveMenu', newActiveMenu)
      } catch (e) {
        console.error('保存状态到 sessionStorage 失败:', e)
      }
    },
    { deep: true }
  )
})

// 示例数据回退函数
const useExampleData = () => {
  availableClasses.value = [
    { id: 1, name: '软件工程1班', studentCount: 3, code: 'SE-DEMO-1' },
    { id: 2, name: '软件工程2班', studentCount: 2, code: 'SE-DEMO-2' }
  ]
  availableStudents.value = [
    { id: 4, name: '李四', username: '2023001004', className: '软件工程1班', classIds: [1] },
    { id: 5, name: '王五', username: '2023001005', className: '软件工程1班', classIds: [1] },
    { id: 6, name: '赵六', username: '2023001006', className: '软件工程1班', classIds: [1] },
    { id: 7, name: '孙七', username: '2023001007', className: '软件工程2班', classIds: [2] },
    { id: 8, name: '周八', username: '2023001008', className: '软件工程2班', classIds: [2] }
  ]
  console.log('【调试】已使用示例班级和学生数据')
}

const handleSelectMenu = (index: string) => {
  if (index === 'student-homework') {
    activeMenu.value = index
  } else if (index === 'teacher-grading') {
    activeMenu.value = index
  } else {
    activeMenu.value = index
  }
}

const handleUserMenuCommand = (command: string) => {
  if (command === 'changePassword') {
    router.push('/change-password')
  } else if (command === 'logout') {
    LogOut()
  }
}

const LogOut = async () => {
  try {
    ElMessageBox.confirm(
      '确定要退出登录吗？',
      '退出登录',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(async () => {
        isLoading.value = true
        try {
          if (userStore.token) {
            await logoutApi(userStore.token)
          }
          userStore.logout()
          ElMessage.success('退出登录成功')
          router.push('/login')
        } catch (error: any) {
          console.error('登出失败:', error)
          userStore.logout()
          ElMessage.error(error.message || '登出失败，但已清除本地会话')
          router.push('/login')
        } finally {
          isLoading.value = false
        }
      })
      .catch(() => {})
  } catch (error: any) {
    console.error('确认框错误:', error)
  }
}

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    'ai-qa': '💬 AI 问答',
    'ai-ppt': '📊 PPT 生成',
    'ai-homework': '📝 课堂作业（出题）',
    'teacher-grading': '✅ 作业批改',
    'student-homework': '📚 我的作业',
    'file-public': '🌐 公开文件资料',
    'file-private': '🔒 教师个人资料'
  }
  return titles[activeMenu.value] || 'AI 课堂系统'
})

// AI 问答
const inputMsg = ref('')
const chatLoading = ref(false)
const chatList = ref<Array<{ role: string; content: string }>>([{ role: 'ai', content: '你好！我是 AI 课堂助手。你需要我帮你解答问题、生成课件还是布置作业呢？' }])
const chatWindowRef = ref<HTMLDivElement>()

const scrollToBottom = async () => {
  await nextTick()
  if (chatWindowRef.value) {
    chatWindowRef.value.scrollTop = chatWindowRef.value.scrollHeight
  }
}

const sendMessage = async () => {
  if (!inputMsg.value.trim()) return
  if (chatLoading.value) return
  
  chatList.value.push({ role: 'user', content: inputMsg.value })
  const userText = inputMsg.value
  inputMsg.value = ''
  await scrollToBottom()
  
  chatList.value.push({ role: 'ai', content: '思考中...' })
  const aiMessageIndex = chatList.value.length - 1
  const aiMessage = chatList.value[aiMessageIndex] as any
  chatLoading.value = true
  
  try {
    console.log('【调试】发送 AI 问答请求:', userText)
    
    const response = await aiChatApi({
      message: userText,
      history: chatList.value.slice(0, -1).filter((msg: any) => msg.role !== '' && msg.content !== '')
    }) as any
    
    console.log('【调试】AI 回复:', response)
    
    if (response.code === 0 && response.data) {
      aiMessage.content = response.data.reply || response.data || '暂无回复'
      ElMessage.success('AI 回复已收到')
    } else {
      aiMessage.content = '暂时无法获取 AI 回复，请检查后端服务是否正常运行'
      ElMessage.error(response.message || 'AI 服务异常')
    }
  } catch (error: any) {
    console.error('【调试】Chat error:', error)
    aiMessage.content = `请求失败: ${error.message || '请检查后端服务'}`
    ElMessage.error(`AI 服务连接失败: ${error.message || '请重试'}`)
  } finally {
    chatLoading.value = false
    await scrollToBottom()
  }
}

// PPT 生成
const pptForm = reactive({
  topic: '',
  pages: 10,
  style: 'simple'
})
const pptLoading = ref(false)
const pptOutline = ref('')  // PPT 大纲内容
const pptPagesCount = ref(0)
const pptTaskId = ref<number | null>(null)  // 创建的 PPT 任务 ID
const pptTaskStatus = ref('')  // PPT 任务状态
const pptResultUrl = ref('') // PPT 结果URL (用于下载)
const pptPreviewUrl = ref('') // PPT 预览URL (可能需要外网可访问的URL)

const generatePPT = async () => {
  if (!pptForm.topic.trim()) {
    ElMessage.warning('请输入 PPT 主题')
    return
  }
  
  pptLoading.value = true
  pptOutline.value = ''
  pptResultUrl.value = ''
  pptPreviewUrl.value = ''
  pptTaskStatus.value = ''
  try {
    // 第一步：生成 PPT 大纲
    console.log('【调试】第一步：生成 PPT 大纲:', pptForm.topic)
    const outlineResponse = await aiGeneratePPTOutlineApi({
      topic: pptForm.topic,
      pages: pptForm.pages,
      style: pptForm.style
    }) as any
    
    console.log('【调试】大纲生成响应:', outlineResponse)
    
    if (outlineResponse.code !== 0) {
      ElMessage.error(outlineResponse.message || 'PPT 大纲生成失败')
      return
    }
    
    const outlineData = outlineResponse.data
    pptOutline.value = outlineData.markdownOutline || ''
    pptPagesCount.value = outlineData.pages || pptForm.pages
    
    console.log('【调试】PPT 大纲已生成，共 ' + pptPagesCount.value + ' 页')
    ElMessage.success('PPT 大纲已生成，正在创建任务...')
    
    // 第二步：创建 PPT 任务（根据大纲生成实际 PPT）
    console.log('【调试】第二步：创建 PPT 任务')
    const formData = new FormData()
    formData.append('prompt', "主题：" + pptForm.topic + "\n" + "大纲要求：" + pptOutline.value)
    formData.append('pages', pptForm.pages.toString())
    if (pptForm.style) {
      formData.append('style', pptForm.style)
    }
    
    const taskResponse = await createPPTTaskApi(formData) as any
    
    console.log('【调试】PPT 任务创建响应:', taskResponse)
    
    if (taskResponse.code !== 0) {
      ElMessage.error(taskResponse.message || 'PPT 任务创建失败')
      return
    }
    
    const taskData = taskResponse.data
    pptTaskId.value = taskData.recordId
    pptTaskStatus.value = taskData.status
    
    console.log('【调试】PPT 任务已创建，ID:', pptTaskId.value, '状态:', taskData.status)
    ElMessage.success(`PPT 任务已创建 (ID: ${pptTaskId.value})，状态: ${taskData.status}`)
    
    // 第三步：定时查询任务状态
    if (pptTaskId.value) {
      // 启动轮询，每 5 秒查询一次状态
      let pollCount = 0
      const maxPolls = 60  // 最多轮询 60 次（5分钟）
      
      const pollInterval = setInterval(async () => {
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval)
          ElMessage.warning('PPT 生成超时，请稍后手动查询或刷新页面')
          return
        }
        
        try {
          const statusResponse = await getPPTTaskByIdApi(pptTaskId.value!) as any
          if (statusResponse.code === 0) {
            const status = statusResponse.data.status
            pptTaskStatus.value = status
            console.log('【调试】PPT 任务状态查询:', status)
            
            if (status === 'SUCCESS') {
              clearInterval(pollInterval)
              pptLoading.value = false
              
              const data = statusResponse.data;
              pptResultUrl.value = data.resultFileUrl || data.downloadUrl
              
              // 优先使用远端公网 URL 进行预览（Office 预览需公网 HTTPS）
              pptPreviewUrl.value = data.remoteDownloadUrl || data.resultFileUrl || data.downloadUrl
              
              // 若链接为内网 HTTP（如含端口号 9000 且不是从公网访问），微软预览大概率会报错，但依然保留 iframe 和显式的下载提示
              
              ElMessage.success('PPT 生成成功！')
              console.log('【调试】PPT 下载链接:', pptResultUrl.value)
              console.log('【调试】PPT 预览链接:', pptPreviewUrl.value)
            } else if (status === 'FAILED' || status === 'RESULT_SYNC_FAILED') {
              clearInterval(pollInterval)
              pptLoading.value = false
              ElMessage.error(`PPT 生成失败: ${statusResponse.data.errorMessage || status}`)
            }
          }
        } catch (error) {
          console.error('【调试】查询 PPT 任务状态失败:', error)
          clearInterval(pollInterval)
          pptLoading.value = false
        }
        
        pollCount++
      }, 5000)  // 5 秒查询一次
    } else {
      pptLoading.value = false
    }
  } catch (error: any) {
    console.error('【调试】PPT 生成错误:', error)
    pptLoading.value = false
    ElMessage.error(`PPT 生成失败: ${error.message || '请重试'}`)
  }
}

// 课堂作业
const hwForm = reactive({
  knowledge: '',
  difficulty: 'medium',
  types: [] as string[],
  questionCount: 5
})
const hwGeneratedQuestions = ref<Array<any>>([])
const hwLoading = ref(false)
const hwPublishing = ref(false)
const hwLoadingTime = ref(0) // 追踪加载时间
let hwLoadingTimer: any = null

// 班级和学生选择
const hwPublishDialogVisible = ref(false)
const selectedClasses = ref<number[]>([]) // 选中的班级 ID
const selectedStudents = ref<number[]>([]) // 选中的学生 ID

// 班级和学生数据（从后端加载）
const availableClasses = ref<Array<any>>([])
const availableStudents = ref<Array<any>>([])

const generateHomework = async () => {
  if (!hwForm.knowledge.trim()) {
    ElMessage.warning('请输入考察知识点')
    return
  }
  if (hwForm.types.length === 0) {
    ElMessage.warning('请选择题型')
    return
  }
  
  hwLoading.value = true
  hwLoadingTime.value = 0
  hwLoadingTimer = setInterval(() => {
    hwLoadingTime.value++
  }, 1000)
  
  let retryCount = 0
  const maxRetries = 4  // 增加到 4 次重试
  
  const attemptGenerate = async (): Promise<any> => {
    try {
      console.log('【调试】生成作业，题型:', hwForm.types)
      
      const requestData = {
        knowledge: hwForm.knowledge,
        difficulty: hwForm.difficulty as 'easy' | 'medium' | 'hard',
        questionTypes: hwForm.types as ('choice' | 'judge')[],
        questionCount: hwForm.questionCount
      }
      
      console.log('【调试】即将发送的请求参数:', JSON.stringify(requestData, null, 2))
      console.log('【调试】知识点内容:', requestData.knowledge)
      console.log('【调试】难度:', requestData.difficulty)
      console.log('【调试】题型数组:', requestData.questionTypes)
      console.log('【调试】题目数量:', requestData.questionCount)
      
      const response = await aiGenerateHomeworkApi(requestData)
      
      console.log('【调试】完整返回结构:', response)
      console.log('【调试】response.code:', response.code)
      console.log('【调试】response.data:', response.data)
      console.log('【调试】response.questions:', (response as any).questions)
      
      // 尝试从多个可能的位置获取题目
      const responseData = response.data as any
      const questions = responseData?.questions || (response as any).questions
      
      if (response.code === 0 && questions && questions.length > 0) {
        hwGeneratedQuestions.value = questions
        console.log('【调试】题目生成成功，共', questions.length, '题:', questions)
        ElMessage.success(`题目生成成功，共 ${questions.length} 题`)
      } else {
        console.error('【调试】未获取到题目数据。response:', response, 'questions:', questions)
        ElMessage.error('题目生成后端返回为空，请检查参数是否正确')
      }
    } catch (error: any) {
      const errorMsg = error.message || '未知错误'
      const errorStatus = error.response?.status
      
      console.error('【调试】Generate homework error:', error)
      console.error('【调试】错误状态码:', errorStatus)
      console.error('【调试】完整错误对象:', error.response?.data || error)
      
      // 504 错误进行重试（最多重试 4 次）
      if (errorStatus === 504 && retryCount < maxRetries) {
        retryCount++
        const delayTime = 3000 + (retryCount * 1000)  // 第 1 次延迟 4 秒，第 2 次 5 秒，第 3 次 6 秒，第 4 次 7 秒
        console.warn(`【调试】发生 504 超时，进行第 ${retryCount}/${maxRetries} 次重试，延迟 ${delayTime/1000} 秒...`)
        ElMessage.warning(`后端网关超时，正在重试... (${retryCount}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delayTime))
        return await attemptGenerate()
      }
      
      // 最终错误处理
      if (errorStatus === 504) {
        ElMessage.error(`后端网关超时（504）：AI 处理请求耗时过长，已重试 ${maxRetries} 次仍未成功。\n\n建议：\n1. 减少题目数量重试\n2. 等待几分钟后重试\n3. 检查后端服务状态\n→ 管理员：请增加 Nginx proxy_read_timeout 配置`)
      } else if (errorMsg.includes('timeout')) {
        ElMessage.error('请求超时：后端处理时间过长，请稍后重试或检查后端服务是否正常运行')
      } else if (errorStatus === 400) {
        ElMessage.error('请求参数错误（400）：请检查填写的知识点、难度等参数是否正确')
      } else if (errorMsg.includes('401') || errorMsg.includes('未登录')) {
        ElMessage.error('登录已过期，请重新登录')
      } else {
        ElMessage.error(`题目生成失败: ${errorMsg}`)
      }
    }
  }
  
  try {
    await attemptGenerate()
  } finally {
    hwLoading.value = false
    if (hwLoadingTimer) {
      clearInterval(hwLoadingTimer)
      hwLoadingTimer = null
    }
    hwLoadingTime.value = 0
  }
}

const publishHomework = async () => {
  if (hwGeneratedQuestions.value.length === 0) {
    ElMessage.warning('请先生成题目')
    return
  }
  
  // 打开班级和学生选择对话框
  hwPublishDialogVisible.value = true
}

const confirmPublishHomework = async () => {
  if (selectedClasses.value.length === 0 && selectedStudents.value.length === 0) {
    ElMessage.warning('请至少选择一个班级或学生')
    return
  }
  
  hwPublishing.value = true
  try {
    const response = await publishHomeworkApi({
      knowledge: hwForm.knowledge,
      difficulty: hwForm.difficulty as 'easy' | 'medium' | 'hard',
      questionTypes: hwForm.types as ('choice' | 'judge')[],
      content: hwGeneratedQuestions.value,
      studentIds: selectedStudents.value,
      classIds: selectedClasses.value
    })
    
    if (response.code === 0) {
      ElMessage.success('作业发布成功')
      hwForm.knowledge = ''
      hwForm.types = []
      hwGeneratedQuestions.value = []
      selectedClasses.value = []
      selectedStudents.value = []
      hwPublishDialogVisible.value = false
    } else {
      ElMessage.error(response.message || '作业发布失败')
    }
  } catch (error: any) {
    console.error('Publish homework error:', error)
    ElMessage.error('作业发布失败，请重试')
  } finally {
    hwPublishing.value = false
  }
}

// 文件系统数据
const publicFiles = ref<any[]>([])
const privateFiles = ref<any[]>([])
const loadingFiles = ref(false)
const downloadingIds = ref<number[]>([])

const uploadDialogVisible = ref(false)
const fileList = ref<any[]>([])
const uploadCourseId = ref<string>('1001')
const uploadVisibility = ref<string>('CLASS')
const uploadRemark = ref<string>('')
const uploadingFile = ref(false)

const onFileChange = (file: any, files: any[]) => {
  fileList.value = [file]
}

const handleUploadDialogClose = () => {
  fileList.value = []
  uploadRemark.value = ''
}

const openUploadDialog = () => {
  uploadDialogVisible.value = true
}

const confirmUploadResource = async () => {
  if (fileList.value.length === 0) {
    ElMessage.warning('请选择文件')
    return
  }
  if (!uploadCourseId.value) {
    ElMessage.warning('请填写所属课程 ID')
    return
  }
  
  uploadingFile.value = true
  try {
    const formData = new FormData()
    formData.append('file', fileList.value[0].raw)
    formData.append('courseId', uploadCourseId.value)
    formData.append('visibility', uploadVisibility.value)
    if (uploadRemark.value) {
      formData.append('remark', uploadRemark.value)
    }

    const { code, message } = await uploadCourseResourceApi(formData) as any
    if (code === 0) {
      ElMessage.success('上传成功')
      uploadDialogVisible.value = false
      loadResources()
    } else {
      ElMessage.error(message || '上传失败')
    }
  } catch (error: any) {
    console.error('上传文件错误:', error)
    ElMessage.error('上传过程出错')
  } finally {
    uploadingFile.value = false
  }
}

const loadResources = async () => {
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
    // ElMessage.error('同步文件数据失败')
  } finally {
    loadingFiles.value = false
  }
}

watch(activeMenu, (newVal) => {
  if (newVal === 'file-public' || newVal === 'file-private') {
    loadResources()
  }
})

const publishFile = async (row: any) => {
  try {
    const { code, message } = await publishCourseResourceApi({
      resourceId: row.resourceId,
      courseId: row.courseId,
    }) as any
    if (code === 0) {
      ElMessage.success('发布成功')
      loadResources()
    } else {
      ElMessage.error(message || '发布失败')
    }
  } catch(e) { ElMessage.error('系统异常') }
}

const revokeFile = async (row: any) => {
  try {
    const { code, message } = await revokeCourseResourceApi({
      resourceId: row.resourceId,
      courseId: row.courseId,
    }) as any
    if (code === 0) {
      ElMessage.success('撤回成功')
      loadResources()
    } else {
      ElMessage.error(message || '撤回失败')
    }
  } catch(e) { ElMessage.error('系统异常') }
}

const deleteFile = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要删除这个资源吗？', '提示', { type: 'warning' })
    const { code, message } = await deleteResourceApi(row.resourceId) as any
    if (code === 0) {
      ElMessage.success('删除成功')
      loadResources()
    } else {
      ElMessage.error(message || '删除失败')
    }
  } catch {}
}

import service from '@/api/request'

const previewFile = async (row: any) => {
  try {
    // 根据文档添加文件类型限制的前端校验
    const supportedTypes = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp']
    const ext = (row.suffix || '').toLowerCase()
    
    if (!supportedTypes.includes(ext)) {
      ElMessage.warning(`[${row.originalFilename || '该文件'}] 暂不支持在线预览，请下载后查看`)
      return
    }

    const isTeacherRole = isTeacher.value && activeMenu.value === 'file-private'
    const res = isTeacherRole 
      ? await getTeacherPreviewUrlApi(row.resourceId) as any
      : await getStudentPreviewUrlApi(row.resourceId) as any

    if (res.code === 0 && res.data) {
      window.open(res.data, '_blank')
    } else {
      ElMessage.warning(res.message || '该文件暂时不支持直接在线预览')
    }
  } catch (e: any) { 
    ElMessage.error('预览链接获取失败') 
  }
}

const downloadFile = async (row: any) => {
  try {
    downloadingIds.value.push(row.resourceId)
    ElMessage.info('开始请求下载，请稍候...')
    const url = (isTeacher.value && activeMenu.value === 'file-private') 
      ? `/api/resource/course/download?resourceId=${row.resourceId}`
      : `/api/resource/student/download?resourceId=${row.resourceId}`

    const response = await service.get(url, { responseType: 'blob' }) as any
    const blob = new Blob([response.data], { type: response.headers['content-type'] })
    
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    
    // 优先使用前端列表中已知正确的原始业务文件名
    let fileName = row.originalFilename
    
    // 只有在没拿到原始文件名时，才尝试从响应头提取
    if (!fileName) {
      const contentDisposition = response.headers['content-disposition']
      fileName = 'download_file'
      if (contentDisposition) {
        // 先尝试匹配符合 RFC 5987 / 6266 标准的 filename*=UTF-8''...
        const utf8FilenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
        // 再匹配传统的 filename=...
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        
        if (utf8FilenameMatch && utf8FilenameMatch.length === 2) {
          fileName = decodeURIComponent(utf8FilenameMatch[1])
        } else if (fileNameMatch && fileNameMatch.length === 2) {
          // 处理后端使用 RFC 2047 (如 =?UTF-8?Q?...?= 等邮件格式) 未解码直接塞入头部的兼容问题
          let rawName = fileNameMatch[1]
          if (rawName.startsWith('=?UTF-8?')) {
            rawName = rawName.replace(/=\?(?:utf-8|UTF-8)\?(?:B|b)\?([A-Za-z0-9+/=]+)\?=/g, (_: string, p1: string) => {
              try { return decodeURIComponent(escape(atob(p1))) } catch (e) { return p1 }
            })
            // 这里不做 Q-encoding (Quoted-Printable) 的复杂解码了，如果有极小概率出现的话通常依靠前面的 originalFilename
          } else {
            rawName = decodeURIComponent(rawName)
          }
          fileName = rawName
        }
      }
    }
    
    link.download = fileName
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(downloadUrl)
    ElMessage.success('开始下载')
  } catch (error) {
    console.error('下载文件报错:', error)
    ElMessage.error('下载失败，请重试')
  } finally {
    downloadingIds.value = downloadingIds.value.filter(id => id !== row.resourceId)
  }
}
</script>

<style scoped>
/* 整体布局 */
.dashboard-container { 
  height: 100vh; 
  background-color: #f4f6f8; 
}
.sidebar { 
  background-color: #ffffff; 
  border-right: none; 
  box-shadow: 2px 0 12px rgba(0, 0, 0, 0.05);
  display: flex; 
  flex-direction: column; 
  z-index: 10;
}
.logo { 
  height: 64px; 
  line-height: 64px; 
  text-align: center; 
  font-size: 20px; 
  font-weight: 700; 
  color: #1f2937; 
  background: linear-gradient(to right, #4facfe, #00f2fe);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  border-bottom: 1px solid rgba(0,0,0,0.03); 
}
.role-switch { 
  padding: 16px; 
  text-align: center; 
  background-color: #ffffff; 
  border-bottom: 1px solid rgba(0,0,0,0.03); 
  font-size: 14px; 
  color: #4b5563; 
}
.side-menu { 
  border-right: none; 
  flex: 1; 
  padding-top: 10px;
}
:deep(.side-menu .el-sub-menu__title) {
  font-weight: 700;
  font-size: 15px;
  color: #111827;
  margin-top: 5px;
}
:deep(.side-menu .el-menu-item) {
  font-size: 14px;
  color: #4b5563;
}
:deep(.side-menu .el-menu-item.is-active) {
  font-weight: 600;
  background-color: #eef2ff;
  color: #4f46e5;
  border-right: 3px solid #4f46e5;
}

/* 右侧顶部和内容 */
.top-header { 
  background-color: #ffffff; 
  border-bottom: none; 
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  padding: 0 24px; 
  height: 64px;
}
.page-title { 
  font-size: 18px; 
  font-weight: 600; 
  color: #1f2937; 
}
.main-content { 
  padding: 24px; 
  overflow-y: auto; 
}
.page-section { 
  height: 100%; 
}

/* AI 问答聊天样式 */
.qa-container { 
  display: flex; 
  flex-direction: column; 
  background: #ffffff; 
  border-radius: 12px; 
  padding: 24px; 
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03); 
  height: 100%; 
}
.chat-window { 
  flex: 1; 
  background-color: #f9fafb; 
  border-radius: 10px; 
  padding: 24px; 
  overflow-y: auto; 
  margin-bottom: 24px; 
  min-height: 400px; 
  border: 1px solid #f3f4f6;
}
.chat-msg { 
  display: flex; 
  margin-bottom: 24px; 
  align-items: flex-start; 
}
.chat-msg.user { 
  flex-direction: row-reverse; 
}
.avatar { 
  width: 42px; 
  height: 42px; 
  border-radius: 50%; 
  background-color: #4f46e5; 
  color: white; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  font-weight: bold; 
  font-size: 14px; 
  flex-shrink: 0; 
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);
}
.chat-msg.ai .avatar { 
  background-color: #10b981; 
  margin-right: 16px; 
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.2);
}
.chat-msg.user .avatar { 
  margin-left: 16px; 
}
.msg-bubble { 
  max-width: 70%; 
  padding: 14px 18px; 
  border-radius: 12px; 
  font-size: 15px; 
  line-height: 1.6; 
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04); 
}
.chat-msg.ai .msg-bubble { 
  background-color: #ffffff; 
  border-top-left-radius: 4px; 
  color: #374151;
}
.chat-msg.user .msg-bubble { 
  background-color: #eef2ff; 
  color: #4f46e5; 
  border-top-right-radius: 4px; 
}
.input-area { 
  flex-shrink: 0; 
}

/* 预览框与作业样式 */
.preview-box { 
  background-color: #f9fafb; 
  border-radius: 12px; 
  display: flex; 
  justify-content: center; 
  align-items: center; 
  border: 1px dashed #e5e7eb; 
  height: 400px; 
  transition: all 0.3s ease;
}

.hw-content { 
  max-height: 500px; 
  overflow-y: auto; 
  padding-right: 12px; 
}
.hw-question { 
  margin-bottom: 24px; 
  padding-bottom: 18px; 
}
.question-header { 
  display: flex; 
  gap: 12px; 
  margin-bottom: 10px; 
  align-items: center;
}
.question-no { 
  font-weight: 700; 
  color: #4f46e5; 
  font-size: 16px;
}
.question-type { 
  display: inline-block; 
  padding: 4px 10px; 
  background-color: #eef2ff; 
  color: #4f46e5; 
  border-radius: 6px; 
  font-size: 12px; 
  font-weight: 600;
}
.question-text { 
  font-size: 15px; 
  line-height: 1.7; 
  margin-bottom: 12px; 
  color: #1f2937; 
  font-weight: 500;
}
.options { 
  margin-bottom: 14px; 
  margin-left: 24px; 
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.option { 
  font-size: 14px; 
  color: #4b5563; 
  line-height: 1.6; 
  padding: 8px 12px;
  background-color: #f9fafb;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: background-color 0.2s;
}
.option:hover {
  background-color: #f3f4f6;
}
.answer { 
  font-size: 14px; 
  color: #10b981; 
  line-height: 1.6; 
  margin-bottom: 8px; 
  background-color: #ecfdf5;
  padding: 10px 14px;
  border-radius: 8px;
  display: inline-block;
}
.explanation { 
  font-size: 14px; 
  color: #6b7280; 
  line-height: 1.6; 
  padding: 12px 14px; 
  border-left: 4px solid #e5e7eb; 
  background-color: #f9fafb;
  border-radius: 0 8px 8px 0;
  margin-top: 8px;
}

/* 卡片美化重写 (全局覆写 el-card 在组件内的样式) */
:deep(.el-card) {
  border: none;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03) !important;
  overflow: hidden;
}
:deep(.el-card__header) {
  border-bottom: 1px solid rgba(0,0,0,0.03);
  background-color: #ffffff;
  padding: 18px 24px;
}
:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
}
:deep(.el-table th.el-table__cell) {
  background-color: #f9fafb;
  color: #4b5563;
  font-weight: 600;
}
</style>
