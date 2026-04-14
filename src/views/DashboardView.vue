<template>
  <el-container class="dashboard-container">
    <el-aside width="240px" class="sidebar">
      <div class="logo">{{ $t('dashboard.logo') }}</div>
      
      <div class="role-switch">
        <span>{{ $t('dashboard.currentRole') }} </span>
        <el-tag :type="isAdmin ? 'warning' : (isTeacher ? 'primary' : 'success')" style="cursor: default;" size="large">
          {{ isAdmin ? '[Admin]' : (isTeacher ? 'Teacher ' : 'Student ') }}
        </el-tag>
        <div v-if="userStore.userInfo" style="margin-top: 8px; font-size: 12px; color: #409EFF;">
          {{ userStore.userInfo.name }} (ID: {{ userStore.userInfo.id }})
        </div>
      </div>

      <el-menu 
        :default-active="activeMenu" 
        :default-openeds="['ai-group', 'file-group']"
        @select="handleSelectMenu" 
        class="side-menu"
      >
        <el-sub-menu index="ai-group" v-if="!isAdmin">
          <template #title>
            <span> {{ $t('dashboard.aiAssistant') }}</span>
          </template>
          <el-menu-item index="ai-qa">{{ $t('dashboard.aiQa') }}</el-menu-item>
          <el-menu-item index="ai-ppt" v-if="isTeacher"> {{ $t('dashboard.aiPpt') }}</el-menu-item>
          <el-menu-item index="ai-homework" v-if="isTeacher"> {{ $t('dashboard.aiHomework') }}</el-menu-item>
          <el-menu-item index="teacher-grading" v-if="isTeacher"> {{ $t('dashboard.teacherGrading') }}</el-menu-item>
          <el-menu-item index="student-homework" v-if="isStudent"> {{ $t('dashboard.studentHomework') }}</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="file-group" v-if="!isAdmin">
          <template #title>
            <span> {{ $t('dashboard.fileMaterials') }}</span>
          </template>
          <el-menu-item index="file-public"> {{ $t('dashboard.publicFiles') }}</el-menu-item>
          <el-menu-item index="file-private" v-if="isTeacher"> {{ $t('dashboard.privateFiles') }}</el-menu-item>
        </el-sub-menu>

        <el-sub-menu index="admin-group" v-if="isAdmin">
          <template #title>
            <span> Admin Console</span>
          </template>
          <el-menu-item index="base-info-import">Data Import</el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="top-header">
        <span class="page-title">{{ pageTitle }}</span>
        <div style="display: flex; gap: 15px; align-items: center;">
          <!-- Language Switcher -->
          <el-dropdown trigger="click" @command="handleLanguageChange">
            <span style="font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              {{ $t('common.language') }} <el-icon style="font-size: 12px;"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="en" :disabled="locale === 'en'">English</el-dropdown-item>
                <el-dropdown-item command="zh" :disabled="locale === 'zh'">简体中文</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- User Menu -->
          <el-dropdown trigger="click" @command="handleUserMenuCommand">
            <span style="font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              {{ userStore.userInfo?.name }}
              <el-icon style="font-size: 12px;"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="changePassword">🔐 {{ $t('dashboard.changePwd') }}</el-dropdown-item>
                <el-dropdown-divider />
                <el-dropdown-item command="logout">🚪 {{ $t('dashboard.logout') }}</el-dropdown-item>
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
              <div class="avatar">{{ msg.role === 'user' ? 'me' : 'AI' }}</div>
              <div class="msg-bubble">{{ msg.role === 'ai' && (msg.content.includes('你好！我是 AI') || msg.content.includes('Hello! I am the AI')) ? $t('dashboard_mod.aiGreeting') : msg.content }}</div>
            </div>
          </div>
          <div class="input-area">
            <el-input 
              v-model="inputMsg" 
              :placeholder="$t('dashboard_mod.askQuestionPlaceholder')" 
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
                  {{ chatLoading ? $t('dashboard_mod.thinking') : $t('dashboard_mod.send') }}
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
                  <el-form-item :label="$t('dashboard_mod.pptTopic')">
                    <el-input v-model="pptForm.topic" type="textarea" :rows="4" :placeholder="$t('dashboard_mod.pptPlaceholder')" />
                  </el-form-item>
                  <el-form-item :label="$t('dashboard_mod.expectedPages')">
                    <el-slider v-model="pptForm.pages" :min="5" :max="30" show-input />
                  </el-form-item>
                  <el-form-item :label="$t('dashboard_mod.designStyle')">
                    <el-select v-model="pptForm.style" :placeholder="$t('dashboard_mod.selectStyle')" style="width: 100%;">
                      <el-option :label="$t('dashboard_mod.styleAcademic')" value="simple" />
                      <el-option :label="$t('dashboard_mod.styleCartoon')" value="cartoon" />
                      <el-option :label="$t('dashboard_mod.styleTech')" value="tech" />
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
                    {{ pptLoading ? '⏳ ' + $t('dashboard_mod.generating') : '🚀 ' + $t('dashboard_mod.generatePptBtn') }}
                  </el-button>
                </el-form>
              </el-col>
              <el-col :span="16">
                <!-- {{ $t('dashboard_mod.pptSuccessTitle') }} -->
                <div v-if="pptResultUrl" class="preview-box" style="background-color: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #e1f3d8; height: 100%; display: flex; flex-direction: column;">
                  <div style="margin-bottom: 10px; padding: 15px; background: #f0f9eb; border-radius: 4px;">
                    <div style="color: #67C23A; font-size: 18px; font-weight: bold; margin-bottom: 8px;">
                      <el-icon><CircleCheckFilled /></el-icon> PPT generation successful!
                    </div>
                    <div style="font-size: 14px; color: #606266; margin-bottom: 15px;">
                      {{ $t('dashboard_mod.pptReady') }}。{{ $t('dashboard_mod.secLimitText') }}，{{ $t('dashboard_mod.intranetFilesText') }}（{{ $t('dashboard_mod.likeLocalText') }} 9000 端口）无法直接通过外部 Office 服务{{ $t('dashboard_mod.preview') }}，如果下方{{ $t('dashboard_mod.preview') }}框出错呈现 "An error occurred"，请直接点击{{ $t('dashboard_mod.download') }}按钮在本地打开{{ $t('dashboard_mod.preview') }}。
                    </div>
                    <div style="display: flex; gap: 10px;">
                      <a :href="pptResultUrl" target="_blank" style="text-decoration: none;">
                        <el-button type="success" size="large"><el-icon style="margin-right: 4px"><Download /></el-icon>{{ $t('dashboard_mod.downloadPptBtn') }}</el-button>
                      </a>
                    </div>
                    <div v-if="pptCredits && pptCredits.deducted !== null && pptCredits.deducted !== undefined" style="margin-top: 10px; padding-top: 10px; border-top: 1px dotted #ccc;">
                        <el-tag type="info" size="small">Credits Deducted: {{ pptCredits.deducted }}</el-tag>
                        <el-tag v-if="pptCredits.remaining !== null && pptCredits.remaining !== undefined" type="success" size="small" style="margin-left: 10px;">Credits Remaining: {{ pptCredits.remaining }}</el-tag>
                    </div>
                  </div>
                  <!-- 使用微软 Office Online {{ $t('dashboard_mod.preview') }} -->
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

                <!-- 处理中Status -->
                <div v-else-if="pptTaskStatus === 'PROCESSING' || pptTaskStatus === 'SUBMITTED'" class="preview-box" style="display: flex; align-items: center; justify-content: center; height: 100%; min-height: 400px;">
                  <el-result icon="info" title="PPT 生成Status">
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
                  <div style="margin-bottom: 10px; color: #409EFF; font-weight: bold;">📄 PPT outline ({{ pptPagesCount }} 页)</div>
                  <el-text style="white-space: pre-wrap;">{{ pptOutline }}</el-text>
                </div>

                <div v-else class="preview-box">
                  <el-empty :description="$t('dashboard_mod.noPreviewText')" />
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
                  <span style="font-weight: bold;">✨ {{ $t('dashboard_mod.aiQuestionsTitle') }}</span>
                </template>
                <el-form label-position="top">
                  <el-form-item :label="$t('dashboard_mod.additionalPrompt') || 'Additional Prompt'">
                    <el-input 
                      v-model="hwForm.prompt" 
                      type="textarea" 
                      :rows="2" 
                      placeholder="Optional, can be used to constrain the style, scenario, and expression of the question" 
                    />
                  </el-form-item>
                  <el-form-item :label="$t('dashboard_mod.referenceFile') || 'Reference File'">
                    <el-upload
                      class="upload-demo"
                      action="#"
                      :auto-upload="false"
                      :limit="1"
                      accept=".txt,.md,.csv,.docx,.json,.xml,.html,.yaml,.pdf"
                      :on-change="handleFileChange"
                      v-model:file-list="hwForm.fileList"
                    >
                      <el-button type="primary">Select File</el-button>
                      <template #tip>
                        <div class="el-upload__tip">
                          Supports txt, md, csv, docx, pdf etc., not exceeding 100MB
                        </div>
                      </template>
                    </el-upload>
                  </el-form-item>
                  <el-form-item :label="$t('dashboard_mod.knowledgePoints')">
                    <el-input 
                      v-model="hwForm.knowledge" 
                      type="textarea" 
                      :rows="3" 
                      :placeholder="$t('dashboard_mod.pointsPlaceholder')" 
                    />
                  </el-form-item>
                  <el-form-item :label="$t('dashboard_mod.difficulty')">
                    <el-radio-group v-model="hwForm.difficulty">
                      <el-radio-button label="easy">{{ $t('dashboard_mod.diffEasy') }}</el-radio-button>
                      <el-radio-button label="medium">{{ $t('dashboard_mod.diffMedium') }}</el-radio-button>
                      <el-radio-button label="hard">{{ $t('dashboard_mod.diffHard') }}</el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item :label="$t('dashboard_mod.questionTypes')">
                    <el-checkbox-group v-model="hwForm.types">
                      <el-checkbox label="choice">{{ $t('dashboard_mod.typeChoice') }}</el-checkbox>
                      <el-checkbox label="judge">{{ $t('dashboard_mod.typeTrueFalse') }}</el-checkbox>
                    </el-checkbox-group>
                  </el-form-item>
                  <el-form-item :label="$t('dashboard_mod.questionCount')">
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
                    {{ hwLoading ? `⏳ Processing (${hwLoadingTime}s)` : '💡 ' + $t('dashboard_mod.generateQuestionsBtn') }}
                  </el-button>
                </el-form>
              </el-card>
            </el-col>
            <el-col :span="16">
              <el-card shadow="hover">
                <template #header>
                  <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                    <span>{{ $t('dashboard_mod.generatedPreview') }} ({{ hwGeneratedQuestions.length }} questions)</span>
                    <el-button 
                      type="primary" 
                      @click="publishHomework"
                      :loading="hwPublishing"
                      :disabled="hwGeneratedQuestions.length === 0 || hwPublishing"
                    >
                      {{ hwPublishing ? $t('dashboard_mod.publishAction') + '中...' : '📤 ' + $t('dashboard_mod.publishHomeworkBtn') }}
                    </el-button>
                  </div>
                </template>
                <div v-if="hwGeneratedQuestions.length === 0" style="text-align: center; padding: 40px;">
                  <el-empty :description="$t('dashboard_mod.noQuestionsText')" />
                </div>
                <div v-else class="hw-content">
                  <div v-for="(question, idx) in hwGeneratedQuestions" :key="idx" class="hw-question">
                    <div class="question-header">
                      <span class="question-no">{{ idx + 1 }}</span>
                      <span class="question-type">{{ question.type === 'choice' ? $t('dashboard_mod.typeChoice') : $t('dashboard_mod.typeTrueFalse') }}</span>
                    </div>
                    <div class="question-text">{{ question.question }}</div>
                    <div v-if="question.options && question.options.length" class="options">
                      <div v-for="(option, oIdx) in question.options" :key="oIdx" class="option">
                        {{ option }}
                      </div>
                    </div>
                    <div class="answer"><strong>{{ $t('dashboard_mod.answerLabel') }}</strong> {{ question.answer }}</div>
                    <div v-if="question.explanation" class="explanation"><strong>{{ $t('dashboard_mod.explanationLabel') }}</strong> {{ question.explanation }}</div>
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
                <span>{{ $t('dashboard_mod.publicFilesDesc') }}</span>
              </div>
            </template>
            <el-table :data="publicFiles" border style="width: 100%" v-loading="loadingFiles">
              <el-table-column prop="originalFilename" :label="$t('dashboard_mod.fileName')" />
              <el-table-column prop="category" :label="$t('dashboard_mod.category')" width="120" />
              <el-table-column prop="publishTime" :label="$t('dashboard_mod.publishDate')" width="180" />
              <el-table-column :label="$t('dashboard_mod.operation')" min-width="160">
                <template #default="{ row }">
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <el-button link type="primary" size="small" @click="previewFile(row)" style="margin-left: 0;">{{ $t('dashboard_mod.preview') }}</el-button>
                    <el-button link type="primary" size="small" @click="downloadFile(row)" v-if="row.allowDownload !== false" :loading="downloadingIds.includes(row.resourceId)" :disabled="downloadingIds.includes(row.resourceId)" style="margin-left: 0;">{{ $t('dashboard_mod.download') }}</el-button>
                  </div>
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
                <span style="color: #F56C6C; font-weight: bold;">{{ $t('dashboard_mod.privateFilesDesc') }}</span>
                <el-button type="primary" size="small" @click="openUploadDialog">{{ $t('dashboard_mod.uploadMaterialBtn') }}</el-button>
              </div>
            </template>
            <el-table :data="privateFiles" border style="width: 100%" v-loading="loadingFiles">
              <el-table-column prop="originalFilename" :label="$t('dashboard_mod.resourceName')" />
              <el-table-column prop="category" :label="$t('dashboard_mod.category')" width="100" />
              <el-table-column :label="$t('dashboard_mod.publishStatus')" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.publishStatus === 'PUBLISHED' ? 'success' : (row.publishStatus === 'REVOKED' ? 'danger' : 'info')">
                    {{ row.publishStatus === 'PUBLISHED' ? $t('dashboard_mod.statusPublished') : (row.publishStatus === 'REVOKED' ? $t('dashboard_mod.statusRevoked') : $t('dashboard_mod.statusUnpublished')) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="createTime" :label="$t('dashboard_mod.createDate')" width="160" />
              <el-table-column :label="$t('dashboard_mod.operation')" min-width="260" fixed="right">
                <template #default="{ row }">
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <el-button link type="primary" size="small" @click="previewFile(row)" style="margin-left: 0;">{{ $t('dashboard_mod.preview') }}</el-button>
                    <el-button link type="primary" size="small" @click="downloadFile(row)" :loading="downloadingIds.includes(row.resourceId)" :disabled="downloadingIds.includes(row.resourceId)" style="margin-left: 0;">{{ $t('dashboard_mod.download') }}</el-button>
                    <el-button link type="success" size="small" v-if="row.publishStatus !== 'PUBLISHED'" @click="publishFile(row)" style="margin-left: 0;">{{ $t('dashboard_mod.publishAction') }}</el-button>
                    <el-button link type="warning" size="small" v-if="row.publishStatus === 'PUBLISHED'" @click="revokeFile(row)" style="margin-left: 0;">{{ $t('dashboard_mod.revokeAction') }}</el-button>
                    <el-button link type="danger" size="small" @click="deleteFile(row)" style="margin-left: 0;">{{ $t('dashboard_mod.deleteAction') }}</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </div>

        <!-- 基础数据导入 - 管理员 -->
        <div v-if="activeMenu === 'base-info-import' && isAdmin" class="page-section" style="padding: 0; background-color: transparent; box-shadow: none;">
          <BaseInfoImportView :in-dashboard="true" />
        </div>

      </el-main>
    </el-container>
  </el-container>

  <!-- 作业{{ $t('dashboard_mod.publishAction') }}对话框 - 班级和学生选择 -->
  <el-dialog 
    v-model="hwPublishDialogVisible" 
    :title="'📤 选择' + $t('dashboard_mod.publishAction') + '对象'" 
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
          确认{{ $t('dashboard_mod.publishAction') }}
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
      <el-form-item :label="$t('dashboard_mod.selectFile')" required>
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
              {{ $t('dashboard_mod.dragFileText') }} <em>{{ $t('dashboard_mod.clickToUpload') }}</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                {{ $t('dashboard_mod.fileLimitText') }}
              </div>
            </template>
          </el-upload>
      </el-form-item>
      <el-form-item :label="$t('dashboard_mod.courseIdLabel')" required>
        <el-input v-model="uploadCourseId" :placeholder="$t('dashboard_mod.courseIdPlaceholder')" type="number" />
      </el-form-item>
      <el-form-item :label="$t('dashboard_mod.visibility')">
        <el-select v-model="uploadVisibility" style="width: 100%;">
          <el-option :label="$t('dashboard_mod.visClass')" value="CLASS" />
          <el-option :label="$t('dashboard_mod.visPrivate')" value="PRIVATE" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('dashboard_mod.remarks')">
        <el-input v-model="uploadRemark" placeholder="选填，资源备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="uploadDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmUploadResource" :loading="uploadingFile">{{ $t('dashboard_mod.confirmUpload') }}</el-button>
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
import { aiChatApi, aiGenerateHomeworkApi, publishHomeworkApi, aiGeneratePPTOutlineApi, getHomeworkPublishTargetsApi, createPPTTaskApi, createGammaPPTTaskApi, getPPTTaskByIdApi } from '@/api/ai'
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
import BaseInfoImportView from './BaseInfoImportView.vue'

import { useI18n } from 'vue-i18n'

const currentGradingData = ref({ homeworkId: '', studentId: '' })
const currentStudentHomeworkData = ref({ homeworkId: '' })

const { t, locale } = useI18n()

const handleLanguageChange = (lang: string) => {
  locale.value = lang
  localStorage.setItem('app_locale', lang)
}

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

// 基础Status
const activeMenu = ref('ai-qa')
const isLoading = ref(false)

// 从 store 获取当前登录用户的角色
const isTeacher = computed(() => userStore.isTeacher)
const isStudent = computed(() => userStore.isStudent)
const isAdmin = computed(() => userStore.isAdmin)

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
  
  // 尝试从 sessionStorage 恢复之前的工作Status
  console.log('【调试】尝试恢复之前的工作Status')
  const savedHwForm = sessionStorage.getItem('dashboardHwForm')
  const savedHwQuestions = sessionStorage.getItem('dashboardHwQuestions')
  const savedPptForm = sessionStorage.getItem('dashboardPptForm')
  const savedPptOutline = sessionStorage.getItem('dashboardPptOutline')
  const savedPptTaskId = sessionStorage.getItem('dashboardPptTaskId')
  const savedActiveMenu = sessionStorage.getItem('dashboardActiveMenu')
  
  if (savedHwForm) {
    try {
      Object.assign(hwForm, JSON.parse(savedHwForm))
      console.log('【调试】已恢复作业表单Status')
    } catch (e) {
      console.error('恢复作业表单失败:', e)
    }
  }
  
  if (savedHwQuestions) {
    try {
      hwGeneratedQuestions.value = JSON.parse(savedHwQuestions)
      console.log('【调试】已恢复生成的questions目列表')
    } catch (e) {
      console.error('恢复questions目列表失败:', e)
    }
  }
  
  if (savedPptForm) {
    try {
      Object.assign(pptForm, JSON.parse(savedPptForm))
      console.log('【调试】已恢复 PPT 表单Status')
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
      ElMessage.warning('Failed to load class and student info, using example data')
      // 回退到示例数据
      useExampleData()
    }
  }
  
  // 监听Status变化，自动保存到 sessionStorage
  watch([hwForm, hwGeneratedQuestions, pptForm, pptOutline, pptTaskId, activeMenu], 
    ([newHwForm, newHwQuestions, newPptForm, newPptOutline, newPptTaskId, newActiveMenu]) => {
      try {
        // 保存作业表单
        sessionStorage.setItem('dashboardHwForm', JSON.stringify(newHwForm))
        // 保存生成的questions目
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
        console.error('保存Status到 sessionStorage 失败:', e)
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
      'Are you sure you want to logout?',
      'Logout',
      {
        confirmButtonText: 'Confirm',
        cancelButtonText: 'Cancel',
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
          ElMessage.success('Logout successful')
          router.push('/login')
        } catch (error: any) {
          console.error('登出失败:', error)
          userStore.logout()
          ElMessage.error(error.message || 'Logout failed on server, cleared local session')
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
    'ai-qa': '💬 ' + t('dashboard.aiQa'),
    'ai-ppt': '📊 ' + t('dashboard.aiPpt'),
    'ai-homework': '📝 ' + t('dashboard.aiHomework'),
    'teacher-grading': '✅ ' + t('dashboard.teacherGrading'),
    'student-homework': '📚 ' + t('dashboard.studentHomework'),
    'file-public': '🌐 ' + t('dashboard.publicFiles'),
    'file-private': '🔒 ' + t('dashboard.privateFiles')
  }
  return titles[activeMenu.value] || t('dashboard.logo')
})

// AI 问答
const inputMsg = ref('')
const chatLoading = ref(false)
const chatList = ref<Array<{ role: string; content: string }>>([{ role: 'ai', content: t('dashboard_mod.aiGreeting') }])
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
  
  chatList.value.push({ role: 'ai', content: 'thinking...' })
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
      ElMessage.success('AI response received')
    } else {
      aiMessage.content = '暂时无法获取 AI 回复，请检查后端服务是否正常运行'
      ElMessage.error(response.message || 'AI service exception')
    }
  } catch (error: any) {
    console.error('【调试】Chat error:', error)
    aiMessage.content = `请求失败: ${error.message || '请检查后端服务'}`
    ElMessage.error(`AI 服务连接失败: ${error.message || 'Please try again'}`)
  } finally {
    chatLoading.value = false
    await scrollToBottom()
  }
}

// PPT 生成
const pptForm = reactive({
  engine: 'xunfei',
  topic: '',
  pages: 10,
  style: 'simple'
})
const pptLoading = ref(false)
const pptOutline = ref('')  // PPT 大纲内容
const pptPagesCount = ref(0)
const pptTaskId = ref<number | null>(null)  // 创建的 PPT 任务 ID
const pptTaskStatus = ref('')  // PPT 任务Status
const pptResultUrl = ref('') // PPT 结果URL (用于下载)
const pptPreviewUrl = ref('') // PPT 预览URL (可能需要外网可访问的URL)
const pptCredits = ref<any>({ deducted: null, remaining: null })
const generatingOutline = ref(false)


const generatePPTOutline = async () => {
  if (!pptForm.topic.trim()) {
    ElMessage.warning('Please enter PPT topic')
    return
  }
  generatingOutline.value = true
  pptOutline.value = ''
  try {
    const outlineResponse = await aiGeneratePPTOutlineApi({
      topic: pptForm.topic,
      pages: pptForm.pages,
      style: pptForm.style
    }) as any
    if (outlineResponse.code !== 0) {
      ElMessage.error(outlineResponse.message || 'Failed to generate PPT outline')
      return
    }
    pptOutline.value = outlineResponse.data.markdownOutline || ''
    pptPagesCount.value = outlineResponse.data.pages || pptForm.pages
    pptTaskStatus.value = 'OUTLINE_GENERATED'
    ElMessage.success('PPT outline generated! Please review and modify it, or click Generate PPT to proceed.')
  } catch (error: any) {
    ElMessage.error('Failed to generate outline: ' + error.message)
  } finally {
    generatingOutline.value = false
  }
}

const generatePPT = async () => {
  if (!pptOutline.value) {
    ElMessage.warning('Please generate an outline first.')
    return
  }
  
  pptLoading.value = true
  pptResultUrl.value = ''
  pptPreviewUrl.value = ''
  let originalStatus = pptTaskStatus.value;
  try {
    pptTaskStatus.value = 'SUBMITTED'
    console.log('【调试】第二步：创建 PPT 任务 (Engine: ' + pptForm.engine + ')')
    const formData = new FormData()
    formData.append('prompt', "主题：" + pptForm.topic + "\n大纲要求：" + pptOutline.value)
    formData.append('pages', pptForm.pages.toString())
    if (pptForm.style) {
      formData.append('style', pptForm.style)
    }

    let taskResponse;
    if (pptForm.engine === 'gamma') {
      taskResponse = await createGammaPPTTaskApi(formData) as any;
    } else {
      taskResponse = await createPPTTaskApi(formData) as any;
    }

    console.log('【调试】PPT 任务创建响应:', taskResponse)
    
    if (taskResponse.code !== 0) {
      pptTaskStatus.value = originalStatus;
      ElMessage.error(taskResponse.message || 'Failed to create PPT task')
      pptLoading.value = false;
      return
    }
    
    const taskData = taskResponse.data
    pptTaskId.value = taskData.recordId
    pptTaskStatus.value = taskData.status
    if (taskData.credits) { pptCredits.value = taskData.credits }
    
    console.log('【调试】PPT task created，ID:', pptTaskId.value, 'Status:', taskData.status)
    ElMessage.success(`PPT task created (ID: ${pptTaskId.value})，Status: ${taskData.status}`)
    
    if (pptTaskId.value) {
      let pollCount = 0
      const maxPolls = 60
      const pollInterval = setInterval(async () => {
        if (pollCount >= maxPolls) {
          clearInterval(pollInterval)
          ElMessage.warning('PPT generation timed out')
          pptLoading.value = false;
          return
        }
        try {
          const statusResponse = await getPPTTaskByIdApi(pptTaskId.value as number) as any
          if (statusResponse.code === 0) {
            const status = statusResponse.data.status
            pptTaskStatus.value = status
            if (statusResponse.data.credits) { pptCredits.value = statusResponse.data.credits }
            
            if (status === 'SUCCESS') {
              clearInterval(pollInterval)
              pptLoading.value = false
              
              const data = statusResponse.data;
              pptResultUrl.value = data.resultFileUrl || data.downloadUrl
              pptPreviewUrl.value = data.remoteDownloadUrl || data.downloadUrl || data.resultFileUrl
              
            } else if (status === 'FAILED' || status === 'RESULT_SYNC_FAILED') {
              clearInterval(pollInterval)
              pptLoading.value = false
              ElMessage.error(`Task Failed: ${statusResponse.data.errorMessage || 'Unknown Error'}`)
            }
          }
        } catch (pollErr) {
          console.error('Poll failed:', pollErr)
        }
        pollCount++
      }, 5000)
    }
  } catch (error: any) {
    console.error('【出错】生成 PPT 异常:', error)
    ElMessage.error('Failed to start task: ' + (error.message || error))
    pptTaskStatus.value = 'FAILED'
    pptLoading.value = false
  }
}

// 课堂作业
const hwForm = reactive({
  knowledge: '',
  difficulty: 'medium',
  types: [] as string[],
  questionCount: 5,
  prompt: '',
  fileList: [] as any[]
})

const handleFileChange = (file: any, fileList: any[]) => {
  const allowedExtensions = ['.txt', '.md', '.csv', '.json', '.xml', '.html', '.yaml', '.docx', '.pdf']
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
  const isAllowed = allowedExtensions.includes(fileExt)
  const isLt100M = file.size / 1024 / 1024 < 100

  if (!isAllowed) {
    ElMessage.error(`File type not supported. Please upload one of: ${allowedExtensions.join(', ')}`)
    hwForm.fileList = []
    return false
  }
  if (!isLt100M) {
    ElMessage.error('File size cannot exceed 100MB!')
    hwForm.fileList = []
    return false
  }
}

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
    ElMessage.warning('Please enter knowledge points')
    return
  }
  if (hwForm.types.length === 0) {
    ElMessage.warning('Please select question types')
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
      console.log('【调试】生成作业，questions型:', hwForm.types)
      
      let requestData: any
      const isFileUpload = hwForm.fileList && hwForm.fileList.length > 0;
      
      if (isFileUpload) {
        const formData = new FormData();
        formData.append('knowledge', hwForm.knowledge);
        formData.append('difficulty', hwForm.difficulty);
        hwForm.types.forEach(item => {
          formData.append('questionTypes', item);
        });
        formData.append('questionCount', hwForm.questionCount.toString());
        if (hwForm.prompt) {
          formData.append('prompt', hwForm.prompt);
        }
        
        // 假设 fileList 中有 file
        formData.append('file', hwForm.fileList[0].raw);
        console.log('【调试】即将发送的请求参数: [FormData]');
        requestData = formData;
      } else {
        requestData = {
          knowledge: hwForm.knowledge,
          difficulty: hwForm.difficulty as 'easy' | 'medium' | 'hard',
          questionTypes: hwForm.types as ('choice' | 'judge')[],
          questionCount: hwForm.questionCount
        }
        if (hwForm.prompt) {
          requestData.prompt = hwForm.prompt;
        }
        console.log('【调试】即将发送的请求参数:', JSON.stringify(requestData, null, 2))
        console.log('【调试】知识点内容:', requestData.knowledge)
        console.log('【调试】难度:', requestData.difficulty)
        console.log('【调试】questions型数组:', requestData.questionTypes)
        console.log('【调试】questions目数量:', requestData.questionCount)
      }
      
      const response = await aiGenerateHomeworkApi(requestData)
      
      console.log('【调试】完整返回结构:', response)
      console.log('【调试】response.code:', response.code)
      console.log('【调试】response.data:', response.data)
      console.log('【调试】response.questions:', (response as any).questions)
      
      // 尝试从多个可能的位置获取questions目
      const responseData = response.data as any
      const questions = responseData?.questions || (response as any).questions
      
      if (response.code === 0 && questions && questions.length > 0) {
        hwGeneratedQuestions.value = questions
        console.log('【调试】Questions generated successfully, total', questions.length, 'questions:', questions)
        ElMessage.success(`Questions generated successfully, total ${questions.length} questions`)
      } else {
        console.error('【调试】未获取到questions目数据。response:', response, 'questions:', questions)
        ElMessage.error('Backend returned empty for questions, check parameters')
      }
    } catch (error: any) {
      const errorMsg = error.message || '未知错误'
      const errorStatus = error.response?.status
      
      console.error('【调试】Generate homework error:', error)
      console.error('【调试】错误Status码:', errorStatus)
      console.error('【调试】完整错误对象:', error.response?.data || error)
      
      // 504 错误进行重试（最多重试 4 次）
      if (errorStatus === 504 && retryCount < maxRetries) {
        retryCount++
        const delayTime = 3000 + (retryCount * 1000)  // 第 1 次延迟 4 秒，第 2 次 5 秒，第 3 次 6 秒，第 4 次 7 秒
        console.warn(`【调试】发生 504 超时，进行第 ${retryCount}/${maxRetries} 次重试，延迟 ${delayTime/1000} 秒...`)
        ElMessage.warning(`Backend gateway timeout, retrying... (${retryCount}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delayTime))
        return await attemptGenerate()
      }
      
      // 最终错误处理
      if (errorStatus === 504) {
        ElMessage.error(`Backend gateway timeout (504): AI processing too long, retried ${maxRetries} times without success. Suggestions: 1. Reduce questions 2. Wait 3. Check backend. Admin: increase Nginx proxy_read_timeout.`)
      } else if (errorMsg.includes('timeout')) {
        ElMessage.error('Request timeout: backend processing too long, please retry later')
      } else if (errorStatus === 400) {
        ElMessage.error('Parameter error (400): check knowledge point, difficulty, etc.')
      } else if (errorMsg.includes('401') || errorMsg.includes('未登录')) {
        ElMessage.error('Login expired, please login again')
      } else {
        ElMessage.error(`Failed to generate questions: ${errorMsg}`)
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
    ElMessage.warning('Please generate questions first')
    return
  }
  
  // 打开班级和学生选择对话框
  hwPublishDialogVisible.value = true
}

const confirmPublishHomework = async () => {
  if (selectedClasses.value.length === 0 && selectedStudents.value.length === 0) {
    ElMessage.warning('Please select at least one class or student')
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
      ElMessage.success('Homework published successfully')
      hwForm.knowledge = ''
      hwForm.types = []
      hwGeneratedQuestions.value = []
      selectedClasses.value = []
      selectedStudents.value = []
      hwPublishDialogVisible.value = false
    } else {
      ElMessage.error(response.message || 'Failed to publish homework')
    }
  } catch (error: any) {
    console.error('Publish homework error:', error)
    ElMessage.error('Failed to publish homework, please try again')
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
    ElMessage.warning('Please select a file')
    return
  }
  if (!uploadCourseId.value) {
    ElMessage.warning('Please fill in the course ID')
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
      ElMessage.success('Upload successful')
      uploadDialogVisible.value = false
      loadResources()
    } else {
      ElMessage.error(message || 'Upload failed')
    }
  } catch (error: any) {
    console.error('上传文件错误:', error)
    ElMessage.error('Upload process error')
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
    // ElMessage.error('Failed to sync file data')
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
      ElMessage.success('Publish successful')
      loadResources()
    } else {
      ElMessage.error(message || 'Publish failed')
    }
  } catch(e) { ElMessage.error('System exception') }
}

const revokeFile = async (row: any) => {
  try {
    const { code, message } = await revokeCourseResourceApi({
      resourceId: row.resourceId,
      courseId: row.courseId,
    }) as any
    if (code === 0) {
      ElMessage.success('Revoke successful')
      loadResources()
    } else {
      ElMessage.error(message || 'Revoke failed')
    }
  } catch(e) { ElMessage.error('System exception') }
}

const deleteFile = async (row: any) => {
  try {
    await ElMessageBox.confirm('Are you sure to delete this resource?', 'Notice', { type: 'warning' })
    const { code, message } = await deleteResourceApi(row.resourceId) as any
    if (code === 0) {
      ElMessage.success('Delete successful')
      loadResources()
    } else {
      ElMessage.error(message || 'Delete failed')
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
      ElMessage.warning(`[${row.originalFilename || 'This file'}] does not support online preview, please download`)
      return
    }

    const isTeacherRole = isTeacher.value && activeMenu.value === 'file-private'
    const res = isTeacherRole 
      ? await getTeacherPreviewUrlApi(row.resourceId) as any
      : await getStudentPreviewUrlApi(row.resourceId) as any

    if (res.code === 0 && res.data) {
      window.open(res.data, '_blank')
    } else {
      ElMessage.warning(res.message || 'This file currently does not support direct online preview')
    }
  } catch (e: any) { 
    ElMessage.error('Failed to get preview link') 
  }
}

const downloadFile = async (row: any) => {
  try {
    downloadingIds.value.push(row.resourceId)
    ElMessage.info('Requesting download, please wait...')
    
    // 不用管是公开还是私密页面，凡是老师角色都应该调用 course/download 接口，学生角色调用 student/download 接口
    const url = isTeacher.value
      ? `/api/resource/course/download?resourceId=${row.resourceId}`
      : `/api/resource/student/download?resourceId=${row.resourceId}`

    const response = await service.get(url, { responseType: 'blob' }) as any
    
    // 防御性检查：如果有错误消息而且是 json，则不要乱码下载
    if (response.data && response.data.type === 'application/json') {
       const text = await response.data.text()
       const json = JSON.parse(text)
       throw new Error(json.message || '文件请求验证失败')
    }

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
          // 处理后端使用 RFC 2047 (如 =?UTF-8?Q?...?= 等邮件格式) 未解码直接塞入头部的兼容问questions
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
    ElMessage.success('Starting download')
  } catch (error) {
    console.error('下载文件报错:', error)
    ElMessage.error('Download failed, please try again')
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

/* {{ $t('dashboard_mod.preview') }}框与作业样式 */
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
