<template>
  <el-container class="dashboard-container">
    <el-aside width="240px" class="sidebar">
      <div class="logo">{{ $t('dashboard.logo') }}</div>

      <div class="role-switch">
        <span>{{ $t('dashboard.currentRole') }} </span>
        <el-tag
          :type="isAdmin ? 'warning' : isTeacher ? 'primary' : 'success'"
          style="cursor: default"
          size="large"
        >
          {{ isAdmin ? '[Admin]' : isTeacher ? 'Teacher ' : 'Student ' }}
        </el-tag>
        <div v-if="userStore.userInfo" style="margin-top: 8px; font-size: 12px; color: #409eff">
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
          <el-menu-item index="ai-homework" v-if="isTeacher">
            {{ $t('dashboard.aiHomework') }}</el-menu-item
          >
          <el-menu-item index="teacher-grading" v-if="isTeacher">
            {{ $t('dashboard.teacherGrading') }}</el-menu-item
          >
          <el-menu-item index="student-homework" v-if="isStudent">
            {{ $t('dashboard.studentHomework') }}</el-menu-item
          >
        </el-sub-menu>

        <el-sub-menu index="file-group" v-if="!isAdmin">
          <template #title>
            <span> {{ $t('dashboard.fileMaterials') }}</span>
          </template>
          <el-menu-item index="file-public"> {{ $t('dashboard.publicFiles') }}</el-menu-item>
          <el-menu-item index="file-private" v-if="isTeacher">
            {{ $t('dashboard.privateFiles') }}</el-menu-item
          >
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
        <div style="display: flex; gap: 15px; align-items: center">
          <!-- AI Chat Records Button -->
          <el-badge v-if="!isAdmin" :value="chatRecordsTotal ?? 0" type="info">
            <el-button link @click="openChatRecordsDrawer" style="font-size: 16px;">
              <el-icon><ChatDotRound /></el-icon>
            </el-button>
          </el-badge>

          <!-- Credits Button -->
          <el-badge v-if="isTeacher" :value="creditsTotalCredits ?? 0" type="warning">
            <el-button link @click="openCreditsDrawer" style="font-size: 16px;">
              <el-icon><Coin /></el-icon>
            </el-button>
          </el-badge>

          <!-- PPT Task List Button -->
          <el-badge v-if="isTeacher" :value="finishedTasksCount" type="success">
            <el-button link @click="showTaskList = true" style="font-size: 16px;">
              <el-icon><List /></el-icon>
            </el-button>
          </el-badge>

          <!-- Language Switcher -->
          <el-dropdown trigger="click" @command="handleLanguageChange">
            <span
              style="font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 4px"
            >
              {{ $t('common.language') }} <el-icon style="font-size: 12px"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="en" :disabled="locale === 'en'"
                  >English</el-dropdown-item
                >
                <el-dropdown-item command="zh" :disabled="locale === 'zh'"
                  >简体中文</el-dropdown-item
                >
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- User Menu -->
          <el-dropdown trigger="click" @command="handleUserMenuCommand">
            <span
              style="font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 4px"
            >
              {{ userStore.userInfo?.name }}
              <el-icon style="font-size: 12px"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="changePassword"
                  >🔐 {{ $t('dashboard.changePwd') }}</el-dropdown-item
                >
                <el-dropdown-divider />
                <el-dropdown-item command="logout"
                  >🚪 {{ $t('dashboard.logout') }}</el-dropdown-item
                >
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <!-- AI 问答 -->
        <div v-if="activeMenu === 'ai-qa'" class="page-section qa-container">
          <div class="chat-window" ref="chatWindowRef">
            <div
              v-for="(msg, index) in chatList"
              :key="index"
              :class="['chat-msg', msg.role === 'user' ? 'user' : 'ai']"
            >
              <div class="avatar">{{ msg.role === 'user' ? 'me' : 'AI' }}</div>
              <div
                v-if="msg.role === 'ai'"
                class="msg-bubble markdown-body"
                v-html="
                  DOMPurify.sanitize(
                    marked(
                      msg.content.includes('你好！我是 AI') ||
                        msg.content.includes('Hello! I am the AI')
                        ? $t('dashboard_mod.aiGreeting')
                        : msg.content,
                    ) as string,
                  )
                "
              ></div>
              <div v-else class="msg-bubble markdown-body" v-text="msg.content"></div>
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
                  <el-form-item
                    :label="$t('dashboard_mod.referenceFile') || 'Upload Reference (Optional)'"
                  >
                    <el-upload
                      class="upload-demo"
                      action="#"
                      :auto-upload="false"
                      :limit="1"
                      accept=".txt,.md,.csv,.docx,.pdf"
                      :on-change="handlePptFileChange"
                      v-model:file-list="pptForm.fileList"
                    >
                      <el-button size="small" type="primary" plain
                        >Upload Reference Document</el-button
                      >
                    </el-upload>
                  </el-form-item>
                  <el-form-item :label="$t('dashboard_mod.pptTopic')">
                    <el-input
                      v-model="pptForm.topic"
                      type="textarea"
                      :rows="4"
                      :placeholder="$t('dashboard_mod.pptPlaceholder')"
                    />
                  </el-form-item>
                  <el-form-item :label="$t('dashboard_mod.expectedPages')">
                    <el-slider v-model="pptForm.pages" :min="5" :max="30" show-input />
                  </el-form-item>
                  <el-form-item :label="$t('dashboard_mod.designStyle')">
                    <el-select
                      v-model="pptForm.style"
                      :placeholder="$t('dashboard_mod.selectStyle')"
                      style="width: 100%"
                    >
                      <el-option :label="$t('dashboard_mod.styleAcademic')" value="simple" />
                      <el-option :label="$t('dashboard_mod.styleCartoon')" value="cartoon" />
                      <el-option :label="$t('dashboard_mod.styleTech')" value="tech" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="Generation Mode">
                    <el-input model-value="Standard Mode" disabled />
                  </el-form-item>

                  <el-button
                    v-if="
                      !pptOutline && pptTaskStatus !== 'PROCESSING' && pptTaskStatus !== 'SUBMITTED'
                    "
                    type="primary"
                    size="large"
                    style="width: 100%; margin-top: 10px"
                    @click="generatePPTOutline"
                    :loading="generatingOutline"
                    :disabled="generatingOutline"
                  >
                    {{ generatingOutline ? '⏳ Generating Outline...' : '📝 Generate PPT Outline' }}
                  </el-button>

                  <div
                    v-if="
                      pptOutline || pptTaskStatus === 'PROCESSING' || pptTaskStatus === 'SUBMITTED'
                    "
                    style="margin-top: 15px; border-top: 1px solid #ebeef5; padding-top: 15px"
                  >
                    <el-button
                      type="success"
                      size="large"
                      style="width: 100%"
                      @click="generatePPT"
                      :loading="pptLoading"
                      :disabled="pptLoading"
                    >
                      {{
                        pptLoading
                          ? '⏳ ' + $t('dashboard_mod.generating')
                          : '🚀 ' + $t('dashboard_mod.generatePptBtn')
                      }}
                    </el-button>

                    <div
                      v-if="
                        pptOutline &&
                        (!pptLoading ||
                          (pptTaskStatus !== 'PROCESSING' && pptTaskStatus !== 'SUBMITTED'))
                      "
                      style="margin-top: 10px; text-align: center"
                    >
                      <el-button
                        link
                        type="info"
                        @click="
                          pptOutline = '';
                          pptTaskStatus = ''
                        "
                        >🗑️ Reset Outline</el-button
                      >
                    </div>
                  </div>
                </el-form>
              </el-col>
              <el-col :span="16">
                <!-- 大纲展示 (可编辑) -->
                <div
                  v-if="pptOutline"
                  class="preview-box"
                  style="
                    background-color: #ffffff;
                    padding: 15px;
                    border-radius: 4px;
                    border: 1px solid #dcdfe6;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    min-height: 400px;
                  "
                >
                  <div
                    style="
                      margin-bottom: 10px;
                      color: #409eff;
                      font-weight: bold;
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                    "
                  >
                    <span>📄 PPT Outline ({{ pptPagesCount }} Pages)</span>
                    <el-tag size="small" type="warning">Editable outline before Generation</el-tag>
                  </div>
                  <el-input
                    v-model="pptOutline"
                    type="textarea"
                    placeholder="Review and modify your outline here before generating the final PPT..."
                    style="flex-grow: 1"
                    :input-style="{
                      height: '100%',
                      minHeight: '350px',
                      resize: 'none',
                      padding: '10px',
                    }"
                  />
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
                  <span style="font-weight: bold"
                    >✨ {{ $t('dashboard_mod.aiQuestionsTitle') }}</span
                  >
                </template>
                <el-form label-position="top">
                  <el-form-item
                    :label="$t('dashboard_mod.additionalPrompt') || 'Additional Prompt'"
                  >
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
                      <el-radio-button label="easy">{{
                        $t('dashboard_mod.diffEasy')
                      }}</el-radio-button>
                      <el-radio-button label="medium">{{
                        $t('dashboard_mod.diffMedium')
                      }}</el-radio-button>
                      <el-radio-button label="hard">{{
                        $t('dashboard_mod.diffHard')
                      }}</el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item :label="$t('dashboard_mod.questionTypes')">
                    <el-checkbox-group v-model="hwForm.types">
                      <el-checkbox label="choice">{{ $t('dashboard_mod.typeChoice') }}</el-checkbox>
                      <el-checkbox label="judge">{{
                        $t('dashboard_mod.typeTrueFalse')
                      }}</el-checkbox>
                    </el-checkbox-group>
                  </el-form-item>
                  <el-form-item :label="$t('dashboard_mod.questionCount')">
                    <el-input-number v-model="hwForm.questionCount" :min="1" :max="20" />
                  </el-form-item>
                  <el-button
                    type="success"
                    style="width: 100%"
                    size="large"
                    @click="generateHomework"
                    :loading="hwLoading"
                    :disabled="hwLoading"
                  >
                    {{
                      hwLoading
                        ? `⏳ Processing (${hwLoadingTime}s)`
                        : '💡 ' + $t('dashboard_mod.generateQuestionsBtn')
                    }}
                  </el-button>
                </el-form>
              </el-card>
            </el-col>
            <el-col :span="16">
              <el-card shadow="hover">
                <template #header>
                  <div
                    style="
                      display: flex;
                      justify-content: space-between;
                      align-items: center;
                      width: 100%;
                    "
                  >
                    <span
                      >{{ $t('dashboard_mod.generatedPreview') }} ({{
                        hwGeneratedQuestions.length
                      }}
                      questions)</span
                    >
                    <el-button
                      type="primary"
                      @click="publishHomework"
                      :loading="hwPublishing"
                      :disabled="hwGeneratedQuestions.length === 0 || hwPublishing"
                    >
                      {{
                        hwPublishing
                          ? $t('dashboard_mod.publishAction') + '中...'
                          : '📤 ' + $t('dashboard_mod.publishHomeworkBtn')
                      }}
                    </el-button>
                  </div>
                </template>
                <div
                  v-if="hwGeneratedQuestions.length === 0"
                  style="text-align: center; padding: 40px"
                >
                  <el-empty :description="$t('dashboard_mod.noQuestionsText')" />
                </div>
                <div v-else class="hw-content">
                  <div
                    v-for="(question, idx) in hwGeneratedQuestions"
                    :key="idx"
                    class="hw-question"
                  >
                    <div class="question-header">
                      <span class="question-no">{{ idx + 1 }}</span>
                      <span class="question-type">{{
                        question.type === 'choice'
                          ? $t('dashboard_mod.typeChoice')
                          : $t('dashboard_mod.typeTrueFalse')
                      }}</span>
                    </div>
                    <div class="question-text">{{ question.question }}</div>
                    <div v-if="question.options && question.options.length" class="options">
                      <div v-for="(option, oIdx) in question.options" :key="oIdx" class="option">
                        {{ option }}
                      </div>
                    </div>
                    <div class="answer">
                      <strong>{{ $t('dashboard_mod.answerLabel') }}</strong> {{ question.answer }}
                    </div>
                    <div v-if="question.explanation" class="explanation">
                      <strong>{{ $t('dashboard_mod.explanationLabel') }}</strong>
                      {{ question.explanation }}
                    </div>
                    <el-divider />
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>

        <!-- 教师批改 - 列表 -->
        <div
          v-if="activeMenu === 'teacher-grading' && isTeacher"
          class="page-section"
          style="padding: 0; background-color: transparent; box-shadow: none"
        >
          <TeacherHomeworkListView :in-dashboard="true" @grade="handleGrade" />
        </div>

        <!-- 教师批改 - 详情 -->
        <div
          v-if="activeMenu === 'teacher-grading-detail' && isTeacher"
          class="page-section"
          style="padding: 0; background-color: transparent; box-shadow: none"
        >
          <TeacherGradingView
            :in-dashboard="true"
            :homework-id="currentGradingData.homeworkId"
            :student-id="currentGradingData.studentId"
            @back="activeMenu = 'teacher-grading'"
          />
        </div>

        <!-- 学生作业 - 列表 -->
        <div
          v-if="activeMenu === 'student-homework' && !isTeacher"
          class="page-section"
          style="padding: 0; background-color: transparent; box-shadow: none"
        >
          <StudentHomeworkView :in-dashboard="true" @detail="handleStudentHomeworkDetail" />
        </div>

        <!-- 学生作业 - 详情 -->
        <div
          v-if="activeMenu === 'student-homework-detail' && !isTeacher"
          class="page-section"
          style="padding: 0; background-color: transparent; box-shadow: none"
        >
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
              <div style="display: flex; justify-content: space-between">
                <span>{{ $t('dashboard_mod.publicFilesDesc') }}</span>
              </div>
            </template>
            <el-table :data="publicFiles" border style="width: 100%" v-loading="loadingFiles">
              <el-table-column prop="originalFilename" :label="$t('dashboard_mod.fileName')" />
              <el-table-column prop="category" :label="$t('dashboard_mod.category')" width="120" />
              <el-table-column
                prop="publishTime"
                :label="$t('dashboard_mod.publishDate')"
                width="180"
              />
              <el-table-column :label="$t('dashboard_mod.operation')" width="160" fixed="right">
                <template #default="{ row }">
                  <div style="display: flex; gap: 8px; flex-wrap: wrap">
                    <el-button
                      link
                      type="primary"
                      size="small"
                      @click="previewFile(row)"
                      v-if="row.allowPreview !== false"
                      style="margin-left: 0"
                      >{{ $t('dashboard_mod.preview') }}</el-button
                    >
                    <el-button
                      link
                      type="primary"
                      size="small"
                      @click="downloadFile(row)"
                      v-if="row.allowDownload !== false"
                      :loading="downloadingIds.includes(getResourceId(row))"
                      :disabled="downloadingIds.includes(getResourceId(row))"
                      style="margin-left: 0"
                      >{{ $t('dashboard_mod.download') }}</el-button
                    >
                  </div>
                </template>
              </el-table-column>
            </el-table>
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
              </div>
          </el-card>
        </div>

        <!-- 文件资料 - 私密 -->
        <div v-if="activeMenu === 'file-private' && isTeacher" class="page-section">
          <el-card shadow="never" style="background-color: #fafafa">
            <template #header>
              <div style="display: flex; justify-content: space-between">
                <span style="color: #f56c6c; font-weight: bold">{{
                  $t('dashboard_mod.privateFilesDesc')
                }}</span>
                <el-button type="primary" size="small" @click="openUploadDialog">{{
                  $t('dashboard_mod.uploadMaterialBtn')
                }}</el-button>
              </div>
            </template>
            <el-table :data="privateFiles" border style="width: 100%" v-loading="loadingFiles">
              <el-table-column prop="originalFilename" :label="$t('dashboard_mod.resourceName')" />
              <el-table-column prop="category" :label="$t('dashboard_mod.category')" width="100" />
              <el-table-column :label="$t('dashboard_mod.publishStatus')" width="100">
                <template #default="{ row }">
                  <el-tag
                    :type="
                      row.publishStatus === 'PUBLISHED'
                        ? 'success'
                        : row.publishStatus === 'REVOKED'
                          ? 'danger'
                          : 'info'
                    "
                  >
                    {{
                      row.publishStatus === 'PUBLISHED'
                        ? $t('dashboard_mod.statusPublished')
                        : row.publishStatus === 'REVOKED'
                          ? $t('dashboard_mod.statusRevoked')
                          : $t('dashboard_mod.statusUnpublished')
                    }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="createTime"
                :label="$t('dashboard_mod.createDate')"
                width="160"
              />
              <el-table-column :label="$t('dashboard_mod.operation')" width="230" fixed="right">
                <template #default="{ row }">
                  <div style="display: flex; gap: 8px; flex-wrap: wrap">
                    <el-button
                      link
                      type="primary"
                      size="small"
                      @click="previewFile(row)"
                      v-if="row.allowPreview !== false"
                      style="margin-left: 0"
                      >{{ $t('dashboard_mod.preview') }}</el-button
                    >
                    <el-button
                      link
                      type="primary"
                      size="small"
                      @click="downloadFile(row)"
                      v-if="row.allowDownload !== false"
                      :loading="downloadingIds.includes(getResourceId(row))"
                      :disabled="downloadingIds.includes(getResourceId(row))"
                      style="margin-left: 0"
                      >{{ $t('dashboard_mod.download') }}</el-button
                    >
                    <el-button
                      link
                      type="success"
                      size="small"
                      v-if="row.publishStatus !== 'PUBLISHED'"
                      @click="publishFile(row)"
                      style="margin-left: 0"
                      >{{ $t('dashboard_mod.publishAction') }}</el-button
                    >
                    <el-button
                      link
                      type="warning"
                      size="small"
                      v-if="row.publishStatus === 'PUBLISHED'"
                      @click="revokeFile(row)"
                      style="margin-left: 0"
                      >{{ $t('dashboard_mod.revokeAction') }}</el-button
                    >
                    <el-button
                      link
                      type="danger"
                      size="small"
                      @click="deleteFile(row)"
                      style="margin-left: 0"
                      >{{ $t('dashboard_mod.deleteAction') }}</el-button
                    >
                  </div>
                </template>
              </el-table-column>
            </el-table>
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
              </div>
          </el-card>
        </div>

        <!-- 基础数据导入 - 管理员 -->
        <div
          v-if="activeMenu === 'base-info-import' && isAdmin"
          class="page-section"
          style="padding: 0; background-color: transparent; box-shadow: none"
        >
          <BaseInfoImportView :in-dashboard="true" />
        </div>
      </el-main>
    </el-container>
    
    <!-- PPT Tasks Drawer -->
    <el-drawer v-model="showTaskList" title="PPT Generation Tasks" size="400px">
      <div v-if="pptSyncNotice" style="margin-bottom: 12px; padding: 10px 12px; border-radius: 8px; background: #ecfdf5; color: #047857; font-size: 13px; border: 1px solid #a7f3d0;">
        {{ pptSyncNotice }}
      </div>
      <div v-if="pptTasks.length === 0" style="text-align: center; color: #999; margin-top: 50px;">
        No tasks yet
      </div>
      <div v-else style="display: flex; flex-direction: column; gap: 15px;">
        <el-card v-for="task in pptTasks" :key="task.id" shadow="hover" body-style="padding: 15px;">
          <div style="font-weight: bold; margin-bottom: 5px;">{{ task.topic }}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 10px;">ID: {{ task.id }} | {{ new Date(task.createdAt).toLocaleString() }}</div>
          
          <div style="margin-bottom: 10px; display: flex; align-items: center; gap: 5px;">
            <el-tag :type="task.status === 'SUCCESS' ? 'success' : task.status === 'FAILED' ? 'danger' : 'warning'">
              {{ task.status }}
            </el-tag>
            <el-icon v-if="task.status === 'SUCCESS'" color="#67c23a"><CircleCheckFilled /></el-icon>
            <el-icon v-if="task.status === 'PROCESSING' || task.status === 'SUBMITTED'" class="is-loading"><Loading /></el-icon>
          </div>

          <div v-if="task.credits && task.credits.deducted > 0" style="font-size: 12px; color: #e6a23c; margin-bottom: 10px;">
            💎 Credits Cost: {{ task.credits.deducted }} | Remaining: {{ task.credits.remaining }}
          </div>

          <div v-if="task.status === 'SUCCESS' && task.personalResourceId" style="font-size: 12px; color: #10b981; margin-bottom: 10px;">
            Synced to your personal resource space. Resource ID: {{ task.personalResourceId }}
          </div>

          <div v-if="task.status === 'SUCCESS'" style="display: flex; gap: 10px;">
            <a :href="task.downloadUrl" target="_blank" style="text-decoration: none">
              <el-button v-if="task.downloadUrl" size="small" type="primary">Download</el-button>
            </a>
          </div>
        </el-card>
      </div>
    </el-drawer>

    <!-- Credits Drawer -->
    <el-drawer v-model="showCreditsList" title="AIPPT Credits" size="520px" @open="fetchCredits">
      <div style="margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap">
        <el-card shadow="never" style="flex: 1; min-width: 180px">
          <div style="font-size: 12px; color: #909399">Total Credits</div>
          <div style="font-size: 24px; font-weight: 700; color: #e6a23c">{{ creditsTotalCredits ?? '-' }}</div>
        </el-card>
        <el-card shadow="never" style="flex: 1; min-width: 180px">
          <div style="font-size: 12px; color: #909399">Records</div>
          <div style="font-size: 24px; font-weight: 700; color: #409eff">{{ creditsTotalCount }}</div>
        </el-card>
      </div>

      <div v-if="creditsRecords.length === 0" style="text-align: center; color: #999; margin-top: 50px;">
        No credit records yet
      </div>
      <div v-else style="display: flex; flex-direction: column; gap: 15px;">
        <el-card v-for="record in creditsRecords" :key="record.recordId" shadow="hover" body-style="padding: 15px;">
          <div style="font-weight: bold; margin-bottom: 5px;">{{ getCreditsRecordTitle(record) }}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 10px;">ID: {{ record.recordId }} | {{ record.createdAt }}</div>

          <div style="margin-bottom: 10px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
            <el-tag :type="record.status === 'SUCCESS' ? 'success' : record.status === 'FAILED' ? 'danger' : 'warning'">
              {{ record.status }}
            </el-tag>
            <el-tag type="info">{{ record.mode }}</el-tag>
          </div>

          <div style="font-size: 12px; color: #e6a23c; margin-bottom: 8px;">
            💎 Credits Cost: {{ record.creditDeducted ?? 0 }} | Remaining: {{ record.creditRemaining ?? '-' }}
          </div>

          <div style="font-size: 12px; color: #909399; margin-bottom: 8px;">
            <span>Task ID: {{ record.taskId || '-' }}</span>
            <span style="margin-left: 12px">Resource ID: {{ record.personalResourceId || '-' }}</span>
          </div>

          <div style="display: flex; gap: 10px;">
            <el-button v-if="record.personalResourceId" size="small" type="info" @click="openCreditsResource(record.personalResourceId)">Preview</el-button>
          </div>
        </el-card>
      </div>

      <div style="margin-top: 15px; display: flex; justify-content: flex-end">
        <el-pagination
          v-model:current-page="creditsPageNo"
          v-model:page-size="creditsPageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="creditsTotalCount"
          @size-change="handleCreditsSizeChange"
          @current-change="handleCreditsPageChange"
        />
      </div>
    </el-drawer>

    <!-- AI Chat Records Drawer -->
    <el-drawer v-model="showChatRecordsList" title="AI Chat Records" size="560px" @open="fetchChatRecords">
      <div style="margin-bottom: 16px; display: flex; gap: 12px; flex-wrap: wrap">
        <el-card shadow="never" style="flex: 1; min-width: 180px">
          <div style="font-size: 12px; color: #909399">Total Records</div>
          <div style="font-size: 24px; font-weight: 700; color: #409eff">{{ chatRecordsTotal }}</div>
        </el-card>
        <el-card shadow="never" style="flex: 2; min-width: 220px">
          <div style="font-size: 12px; color: #909399; margin-bottom: 8px">Session Filter</div>
          <el-input v-model="chatRecordsSessionId" placeholder="Optional sessionId" clearable @keyup.enter="handleChatRecordsSearch" />
          <div v-if="isTeacher && teacherChatFilter.studentId" style="margin-top: 8px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
            <el-tag type="success">Class: {{ teacherChatFilter.className || teacherChatFilter.classId }}</el-tag>
            <el-tag type="warning">Student: {{ teacherChatFilter.studentName || teacherChatFilter.studentId }}</el-tag>
          </div>
        </el-card>
      </div>

      <div style="display: flex; gap: 10px; margin-bottom: 14px">
        <el-button type="primary" :loading="chatRecordsLoading" @click="handleChatRecordsSearch">Search</el-button>
        <el-button @click="resetChatRecordsFilter" :disabled="chatRecordsLoading">Reset</el-button>
        <el-button v-if="isTeacher" type="success" @click="openTeacherStudentPicker" :disabled="chatRecordsLoading">Choose Class & Student</el-button>
        <el-button v-if="isTeacher && teacherChatFilter.studentId" @click="clearTeacherStudentFilter" :disabled="chatRecordsLoading">Clear Student Filter</el-button>
      </div>

      <div v-if="chatRecords.length === 0" style="text-align: center; color: #999; margin-top: 50px;">
        No AI chat records yet
      </div>
      <div v-else style="display: flex; flex-direction: column; gap: 15px;">
        <el-card
          v-for="record in chatRecords"
          :key="record.id"
          shadow="hover"
          body-style="padding: 15px;"
          @click="replayChatRecord(record)"
          style="cursor: pointer;"
        >
          <div class="record-summary">
            <div class="record-summary-header">
              <div class="record-summary-title">
                {{ getRecordPreview(record.question, 110) }}
              </div>
              <div class="record-summary-meta">
                Session: {{ record.sessionId }} | {{ record.createdAt }}
              </div>
            </div>

            <div class="record-summary-tags">
              <el-tag type="info">{{ record.role }}</el-tag>
              <el-tag type="success">{{ record.model }}</el-tag>
              <el-tag type="warning">History: {{ record.historyCount ?? 0 }}</el-tag>
            </div>

            <div class="record-summary-content">
              <div class="record-summary-block">
                <div class="record-summary-label">Question</div>
                <div class="record-summary-text">{{ getRecordPreview(record.question, 180) }}</div>
              </div>
              <div class="record-summary-block">
                <div class="record-summary-label">Answer</div>
                <div class="record-summary-text">{{ getRecordPreview(record.answer, 220) }}</div>
              </div>
            </div>

            <div class="record-summary-footer">Click to replay full session</div>
          </div>
        </el-card>
      </div>

      <div style="margin-top: 15px; display: flex; justify-content: flex-end">
        <el-pagination
          v-model:current-page="chatRecordsPageNo"
          v-model:page-size="chatRecordsPageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="chatRecordsTotal"
          @size-change="handleChatRecordsSizeChange"
          @current-change="handleChatRecordsPageChange"
        />
      </div>
    </el-drawer>

    <el-dialog
      v-model="showTeacherStudentPicker"
      title="Select Student In Class"
      width="520px"
      align-center
    >
      <div style="margin-bottom: 12px">
        <el-select
          v-model="teacherPickerClassId"
          placeholder="Please select a class"
          style="width: 100%"
          :loading="teacherPickerLoading"
        >
          <el-option
            v-for="cls in teacherPickerClasses"
            :key="cls.id"
            :label="`${cls.name} (${cls.studentCount} students)`"
            :value="cls.id"
          />
        </el-select>
      </div>

      <div
        v-loading="teacherPickerLoading"
        style="max-height: 360px; overflow-y: auto; border: 1px solid #ebeef5; border-radius: 6px; padding: 8px"
      >
        <div v-if="teacherPickerStudents.length === 0" style="text-align: center; color: #999; padding: 20px 0">
          No students found in this class
        </div>
        <div v-else style="display: flex; flex-direction: column; gap: 8px">
          <el-card
            v-for="stu in teacherPickerStudents"
            :key="stu.id"
            shadow="hover"
            body-style="padding: 10px 12px"
            style="cursor: pointer"
            @click="pickStudentAndSearch(stu)"
          >
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px">
              <div style="font-weight: 600; color: #303133">{{ stu.name }}</div>
              <el-tag type="info">ID: {{ stu.id }}</el-tag>
            </div>
            <div v-if="stu.username" style="font-size: 12px; color: #909399; margin-top: 4px">
              Username: {{ stu.username }}
            </div>
          </el-card>
        </div>
      </div>

      <template #footer>
        <el-button @click="showTeacherStudentPicker = false">Close</el-button>
      </template>
    </el-dialog>

  </el-container>

  <!-- 作业{{ $t('dashboard_mod.publishAction') }}对话框 - 班级和学生选择 -->
  <el-dialog
    v-model="hwPublishDialogVisible"
    :title="'📤 Select ' + $t('dashboard_mod.publishAction') + ' Objects'"
    width="500px"
    align-center
  >
    <div style="max-height: 400px; overflow-y: auto">
      <!-- 班级选择 -->
      <div style="margin-bottom: 20px">
        <p style="font-weight: bold; margin-bottom: 10px">
          📚 Select classes (multiple choices allowed):
        </p>
        <el-checkbox-group
          v-model="selectedClasses"
          style="display: flex; flex-direction: column; gap: 8px"
        >
          <el-checkbox
            v-for="cls in availableClasses"
            :key="cls.id"
            :label="cls.id"
            style="width: 100%"
          >
            <span style="margin-left: 8px">
              {{ cls.name }}
              <el-tag :type="'info'" size="small">{{ cls.studentCount }} students</el-tag>
            </span>
          </el-checkbox>
        </el-checkbox-group>
      </div>

      <el-divider />

      <!-- 学生选择 -->
      <div>
        <p style="font-weight: bold; margin-bottom: 10px">
          👨‍🎓 Select students (multiple choices allowed):
        </p>
        <el-checkbox-group
          v-model="selectedStudents"
          style="display: flex; flex-direction: column; gap: 8px"
        >
          <el-checkbox
            v-for="student in filteredStudents"
            :key="student.id"
            :label="student.id"
            style="width: 100%"
          >
            <span style="margin-left: 8px">
              {{ student.name }}
              <el-tag :type="'success'" size="small">{{ student.className }}</el-tag>
            </span>
          </el-checkbox>
        </el-checkbox-group>
      </div>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="hwPublishDialogVisible = false">Cancel</el-button>
        <el-button
          type="primary"
          @click="confirmPublishHomework"
          :loading="hwPublishing"
          :disabled="hwPublishing"
        >
          Confirm {{ $t('dashboard_mod.publishAction') }}
        </el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 上传资源对话框 -->
  <el-dialog
    v-model="uploadDialogVisible"
    :title="'📤 ' + $t('dashboard_mod.uploadCourseResource')"
    width="500px"
    append-to-body
    class="resource-upload-dialog"
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
          style="width: 100%"
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
        <el-input
          v-model="uploadCourseId"
          :placeholder="$t('dashboard_mod.courseIdPlaceholder')"
          type="number"
        />
      </el-form-item>
      <el-form-item :label="$t('dashboard_mod.visibility')">
        <el-select v-model="uploadVisibility" style="width: 100%">
          <el-option :label="$t('dashboard_mod.visClass')" value="CLASS" />
          <el-option :label="$t('dashboard_mod.visPrivate')" value="PRIVATE" />
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('dashboard_mod.remarks')">
        <el-input v-model="uploadRemark" placeholder="Optional, resource notes" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="uploadDialogVisible = false">Cancel</el-button>
      <el-button type="primary" @click="confirmUploadResource" :loading="uploadingFile">{{
        $t('dashboard_mod.confirmUpload')
      }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { logoutApi } from '@/api/log'
import { useUserStore } from '@/stores/user'
import { ArrowDown, Loading, Download, CircleCheckFilled, Document, List, Coin, ChatDotRound, Check, Close, VideoPlay } from '@element-plus/icons-vue'
import {
  aiChatApi,
  aiStreamChatFetch,
  aiGenerateHomeworkApi,
  publishHomeworkApi,
  aiGeneratePPTOutlineApi,
  getHomeworkPublishTargetsApi,
  createPPTTaskApi,
  getPPTTaskByIdApi,
  getAipptCreditsApi,
  getMyChatRecordsApi,
  getTeacherChatRecordsApi,
  getTeacherClassesApi,
  getClassStudentsApi,
} from '@/api/ai'
import {
  uploadCourseResourceApi,
  getResourcePageApi,
  getTeacherCourseResourcePageApi,
  publishCourseResourceApi,
  revokeCourseResourceApi,
  getTeacherPreviewUrlApi,
  deleteResourceApi,
  getStudentCourseResourcePageApi,
  getStudentPreviewUrlApi,
  getResourceDownloadUrlApi,
  getTeacherDownloadUrl,
  getStudentDownloadUrl
} from '@/api/resource'

import TeacherHomeworkListView from './TeacherHomeworkListView.vue'
import TeacherGradingView from './TeacherGradingView.vue'
import StudentHomeworkView from './StudentHomeworkView.vue'
import HomeworkDetailView from './HomeworkDetailView.vue'
import BaseInfoImportView from './BaseInfoImportView.vue'

import { useI18n } from 'vue-i18n'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

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

  loadTasksLocally();

  // 页面一进入就预取顶部角标数据，避免只有打开抽屉后才更新数字
  await Promise.allSettled([
    !isAdmin.value ? fetchChatRecords(1) : Promise.resolve(),
    isTeacher.value ? fetchCredits(1) : Promise.resolve(),
  ])

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
  watch([hwForm, hwGeneratedQuestions, pptForm, pptOutline, activeMenu],
    ([newHwForm, newHwQuestions, newPptForm, newPptOutline, newActiveMenu]) => {
      try {
        // 保存作业表单
        sessionStorage.setItem('dashboardHwForm', JSON.stringify(newHwForm))
        // 保存生成的questions目
        sessionStorage.setItem('dashboardHwQuestions', JSON.stringify(newHwQuestions))
        // 保存 PPT 表单
        sessionStorage.setItem('dashboardPptForm', JSON.stringify(newPptForm))
        // 保存 PPT 大纲
        sessionStorage.setItem('dashboardPptOutline', newPptOutline)
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
const chatSessionId = ref('')
const chatList = ref<Array<{ role: string; content: string }>>([{ role: 'ai', content: t('dashboard_mod.aiGreeting') }])
const chatWindowRef = ref<HTMLDivElement>()

const scrollToBottom = async () => {
  await nextTick()
  if (chatWindowRef.value) {
    chatWindowRef.value.scrollTop = chatWindowRef.value.scrollHeight
  }
}

const safeUiError = (fallback: string) => fallback

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
    aiMessage.content = ''
    await aiStreamChatFetch(
      {
        sessionId: chatSessionId.value || undefined,
        message: userText,
        history: chatList.value.slice(0, -1).filter((msg: any) => msg.role !== '' && msg.content !== '')
      },
      (event, data) => {
        if (event === 'heartbeat') return;
        if (event === 'done') {
          chatLoading.value = false;
          scrollToBottom();
          if (data?.sessionId) {
            chatSessionId.value = data.sessionId
          }
          if (data && data.reply && !aiMessage.content) {
            aiMessage.content = data.reply;
          }
          return;
        }
        if (event === 'data' || event === 'message') {
          const token = typeof data === 'string'
            ? data.replace(/^data:/, '').trim()
            : data?.reply || data?.content || data?.message || ''
          if (token) aiMessage.content += token
          scrollToBottom();
        }
      },
      (error) => {
        console.error('【调试】Chat stream error:', error)
        if (!aiMessage.content) {
          aiMessage.content = 'Request failed. Please try again later.'
          ElMessage.error('AI service temporarily unavailable. Please try again later.')
        }
        chatLoading.value = false;
        scrollToBottom();
      }
    )
  } catch (error: any) {
    console.error('【调试】Chat error:', error)
    aiMessage.content = 'Request failed. Please try again later.'
    ElMessage.error('AI service temporarily unavailable. Please try again later.')
    chatLoading.value = false
    await scrollToBottom()
  }
}

// PPT 生成
const pptForm = reactive({
  topic: '',
  pages: 10,
  style: 'simple',
  fileList: [] as any[]
})

const handlePptFileChange = (uploadFile: any) => {
  pptForm.fileList = [uploadFile]
}
const pptLoading = ref(false)
const pptOutline = ref('')  // PPT 大纲内容
const pptPagesCount = ref(0)
const pptTaskStatus = ref('')  // PPT 任务Status (可删, 仅保留由于兼容性)
const pptResultUrl = ref('') // PPT 结果URL (用于下载)
const pptPreviewUrl = ref('') // PPT 预览URL (可能需要外网可访问的URL)
const pptCredits = ref<any>({ deducted: null, remaining: null })
const pptSyncNotice = ref('')
const generatingOutline = ref(false)

// [修改部分] 任务列表
export interface PPTTask {
  id: number
  topic: string
  status: string
  downloadUrl?: string
  previewUrl?: string
  personalResourceId?: number | null
  credits?: { deducted: number, remaining: number }
  createdAt: number
}
const pptTasks = ref<PPTTask[]>([])
const showTaskList = ref(false)
const finishedTasksCount = computed(() => pptTasks.value.filter(t => t.status === 'SUCCESS').length)

// Credits 列表
const showCreditsList = ref(false)
const creditsLoading = ref(false)
const creditsRecords = ref<any[]>([])
const creditsPageNo = ref(1)
const creditsPageSize = ref(10)
const creditsTotalCount = ref(0)
const creditsTotalCredits = ref<number | null>(null)

// AI 问答记录
const showChatRecordsList = ref(false)
const chatRecordsLoading = ref(false)
const chatRecords = ref<any[]>([])
const chatRecordsPageNo = ref(1)
const chatRecordsPageSize = ref(10)
const chatRecordsTotal = ref(0)
const chatRecordsSessionId = ref('')
const showTeacherStudentPicker = ref(false)
const teacherPickerClassId = ref<number | null>(null)
const teacherPickerClasses = ref<any[]>([])
const teacherPickerStudents = ref<any[]>([])
const teacherPickerLoading = ref(false)
const teacherChatFilter = reactive<{
  classId?: number
  className?: string
  studentId?: number
  studentName?: string
}>({})

const openChatRecordsDrawer = async () => {
  showChatRecordsList.value = true
}

const mapClassItem = (item: any) => ({
  id: item.classId ?? item.id,
  name: item.className ?? item.name,
  studentCount: item.studentCount || 0,
})

const mapStudentItem = (item: any) => ({
  id: item.studentId ?? item.id,
  name: item.studentName ?? item.name,
  username: item.username,
})

const loadTeacherClassesWithFallback = async () => {
  try {
    const res = (await getTeacherClassesApi()) as any
    if (res.code === 0 && Array.isArray(res.data)) {
      return (res.data || []).map(mapClassItem)
    }
  } catch (e) {
    console.warn('getTeacherClassesApi failed, fallback to publish-targets', e)
  }

  const fallbackRes = (await getHomeworkPublishTargetsApi()) as any
  if (fallbackRes.code === 0 && fallbackRes.data) {
    return (fallbackRes.data.classes || []).map(mapClassItem)
  }
  throw new Error('Failed to load teacher classes')
}

const loadClassStudentsWithFallback = async (classId: number) => {
  try {
    const res = (await getClassStudentsApi(classId)) as any
    if (res.code === 0 && Array.isArray(res.data)) {
      return (res.data || []).map(mapStudentItem)
    }
  } catch (e) {
    console.warn('getClassStudentsApi failed, fallback to publish-targets', e)
  }

  const fallbackRes = (await getHomeworkPublishTargetsApi()) as any
  if (fallbackRes.code === 0 && fallbackRes.data) {
    const students = fallbackRes.data.students || []
    return students
      .filter((item: any) => {
        const classIds = item.classIds || (item.classId ? [item.classId] : [])
        return Array.isArray(classIds) && classIds.includes(classId)
      })
      .map(mapStudentItem)
  }
  throw new Error('Failed to load class students')
}

const openTeacherStudentPicker = async () => {
  if (!isTeacher.value) return
  showTeacherStudentPicker.value = true
  if (teacherPickerClasses.value.length > 0) return

  teacherPickerLoading.value = true
  try {
    teacherPickerClasses.value = await loadTeacherClassesWithFallback()

    if (!teacherPickerClassId.value && teacherPickerClasses.value.length > 0) {
      teacherPickerClassId.value = teacherPickerClasses.value[0].id
    }
    if (teacherPickerClassId.value) {
      await loadStudentsByClass(teacherPickerClassId.value)
    }
  } catch (e) {
    console.error('openTeacherStudentPicker error', e)
    ElMessage.error('Unable to load classes. Please try again.')
  } finally {
    teacherPickerLoading.value = false
  }
}

const loadStudentsByClass = async (classId: number) => {
  teacherPickerLoading.value = true
  try {
    teacherPickerStudents.value = await loadClassStudentsWithFallback(classId)
  } catch (e) {
    console.error('loadStudentsByClass error', e)
    teacherPickerStudents.value = []
    ElMessage.error('Unable to load students for this class.')
  } finally {
    teacherPickerLoading.value = false
  }
}

watch(teacherPickerClassId, async (newClassId) => {
  if (!showTeacherStudentPicker.value || !newClassId) return
  await loadStudentsByClass(newClassId)
})

const pickStudentAndSearch = (student: any) => {
  const selectedClass = teacherPickerClasses.value.find((item) => item.id === teacherPickerClassId.value)
  teacherChatFilter.classId = teacherPickerClassId.value || undefined
  teacherChatFilter.className = selectedClass?.name || ''
  teacherChatFilter.studentId = student.id
  teacherChatFilter.studentName = student.name
  showTeacherStudentPicker.value = false
  fetchChatRecords(1)
}

const clearTeacherStudentFilter = () => {
  teacherChatFilter.classId = undefined
  teacherChatFilter.className = ''
  teacherChatFilter.studentId = undefined
  teacherChatFilter.studentName = ''
  fetchChatRecords(1)
}

const fetchChatRecords = async (page: number = chatRecordsPageNo.value) => {
  chatRecordsLoading.value = true
  try {
    const res = (isTeacher.value && teacherChatFilter.classId && teacherChatFilter.studentId)
      ? await getTeacherChatRecordsApi({
          classId: teacherChatFilter.classId,
          studentId: teacherChatFilter.studentId,
          sessionId: chatRecordsSessionId.value || undefined,
          pageNo: page,
          pageSize: chatRecordsPageSize.value,
        })
      : await getMyChatRecordsApi({
          sessionId: chatRecordsSessionId.value || undefined,
          pageNo: page,
          pageSize: chatRecordsPageSize.value,
        })
    const data = res as any
    if (data.code === 0) {
      chatRecords.value = data.data.records || []
      chatRecordsTotal.value = data.data.total || 0
      chatRecordsPageNo.value = data.data.pageNo || page
    } else {
      ElMessage.error('Failed to load AI chat records')
    }
  } catch (e) {
    console.error('fetchChatRecords error', e)
    ElMessage.error('Failed to load AI chat records')
  } finally {
    chatRecordsLoading.value = false
  }
}

const handleChatRecordsSearch = () => {
  fetchChatRecords(1)
}

const resetChatRecordsFilter = () => {
  chatRecordsSessionId.value = ''
  fetchChatRecords(1)
}

const handleChatRecordsPageChange = (page: number) => {
  fetchChatRecords(page)
}

const handleChatRecordsSizeChange = (size: number) => {
  chatRecordsPageSize.value = size
  fetchChatRecords(1)
}

const getRecordPreview = (value: string, maxLength: number) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return '-'
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}

const loadSessionToQaPanel = async (sessionId?: string) => {
  if (!sessionId) return
  try {
    const res = (isTeacher.value && teacherChatFilter.classId && teacherChatFilter.studentId)
      ? await getTeacherChatRecordsApi({
          classId: teacherChatFilter.classId,
          studentId: teacherChatFilter.studentId,
          sessionId,
          pageNo: 1,
          pageSize: 200,
        })
      : await getMyChatRecordsApi({
          sessionId,
          pageNo: 1,
          pageSize: 200,
        })
    const data = res as any

    if (data.code === 0) {
      const records = data.data?.records || []
      const replayList: Array<{ role: string; content: string }> = []
      for (const item of records) {
        if (item.question) replayList.push({ role: 'user', content: item.question })
        if (item.answer) replayList.push({ role: 'ai', content: item.answer })
      }

      chatList.value =
        replayList.length > 0
          ? replayList
          : [{ role: 'ai', content: t('dashboard_mod.aiGreeting') }]
      chatSessionId.value = sessionId
      activeMenu.value = 'ai-qa'
      await scrollToBottom()
    } else {
      ElMessage.error('Failed to replay this session')
    }
  } catch (e) {
    console.error('loadSessionToQaPanel error', e)
    ElMessage.error('Failed to replay this session')
  }
}

// 点击回放某条会话记录：在当前新工作台内切换到 AI 问答并加载历史
const replayChatRecord = async (record: any) => {
  try {
    showChatRecordsList.value = false
    await loadSessionToQaPanel(record.sessionId)
  } catch (e) {
    console.error('replayChatRecord error', e)
    ElMessage.error('Failed to replay this session')
  }
}

const openCreditsDrawer = async () => {
  showCreditsList.value = true
  if (creditsRecords.value.length === 0) {
    await fetchCredits(1)
  }
}

const fetchCredits = async (page: number = creditsPageNo.value) => {
  creditsLoading.value = true
  try {
    const res = await getAipptCreditsApi({ pageNo: page, pageSize: creditsPageSize.value }) as any
    if (res.code === 0) {
      creditsRecords.value = res.data.records || []
      creditsTotalCount.value = res.data.total || 0
      creditsTotalCredits.value = res.data.totalCredits ?? null
      creditsPageNo.value = res.data.pageNo || page
    } else {
      ElMessage.error('Failed to load credits records')
    }
  } catch (e) {
    console.error('fetchCredits error', e)
    ElMessage.error('Failed to load credits records')
  } finally {
    creditsLoading.value = false
  }
}

const handleCreditsPageChange = (page: number) => {
  fetchCredits(page)
}

const handleCreditsSizeChange = (size: number) => {
  creditsPageSize.value = size
  fetchCredits(1)
}

const getCreditsRecordTitle = (record: any) => {
  const prompt = String(record?.prompt || '').trim()
  if (!prompt) return record?.mode || 'AIPPT Task'

  const topicMatch = prompt.match(/(?:主题|Topic)[:：]\s*([^\n\r-]+)/i)
  if (topicMatch?.[1]) {
    return topicMatch[1].trim()
  }

  const outlineSplit = (prompt.split('大纲要求：')[0] || '').trim()
  if (outlineSplit) {
    return outlineSplit.replace(/^主题[:：]\s*/i, '').trim()
  }

  return prompt
}

const openCreditsResource = async (resourceId: number) => {
  try {
    const res = await getResourceDownloadUrlApi(resourceId) as any
    if (res.code === 0 && res.data) {
      window.open(res.data, '_blank')
    } else {
      ElMessage.warning(res.message || 'Download url not available')
    }
  } catch (e) {
    console.error('openCreditsResource error', e)
    ElMessage.error('Failed to open resource link')
  }
}

// 每当我们新增 task，就丢进 polling
const activeTimers = new Map<number, any>()
const pollTask = (taskId: number) => {
  if (activeTimers.has(taskId)) return;
  let pollCount = 0;
  const maxPolls = 60;
  const interval = setInterval(async () => {
    if (pollCount >= maxPolls) {
      clearInterval(interval)
      activeTimers.delete(taskId)
      const task = pptTasks.value.find(t => t.id === taskId)
      if (task && (task.status === 'SUBMITTED' || task.status === 'PROCESSING')) {
        task.status = 'TIMEOUT'
      }
      return
    }
    try {
      const res = await getPPTTaskByIdApi(taskId) as any
      if (res.code === 0) {
        const task = pptTasks.value.find(t => t.id === taskId)
        if (task) {
          task.status = res.data.status
          if (res.data.credits) { task.credits = res.data.credits }
          if (res.data.personalResourceId) {
            task.personalResourceId = res.data.personalResourceId
          }
          if (res.data.status === 'SUCCESS') {
            const data = res.data;
            task.downloadUrl = data.downloadUrl || data.fileUrl;
            task.personalResourceId = data.personalResourceId;
            task.previewUrl = data.previewUrl || data.downloadUrl || data.fileUrl;
            if (isTeacher.value && task.personalResourceId) {
              pptSyncNotice.value = `Synced to your personal resource space. Resource ID: ${task.personalResourceId}`
            }
            clearInterval(interval)
            activeTimers.delete(taskId)
            ElMessage.success(
              task.personalResourceId
                ? 'PPT generation completed and synced to your personal resource space.'
                : `Task ID: ${taskId} created successfully!`,
            )
            // Refresh teacher private files list when PPT synced
            if (isTeacher.value && task.personalResourceId) {
              try {
                await refreshPrivateFiles()
              } catch (e) {
                console.error('refreshPrivateFiles failed', e)
              }
            }
            saveTasksLocally()
          } else if (res.data.status === 'FAILED') {
            clearInterval(interval)
            activeTimers.delete(taskId)
            ElMessage.error(`Task ID: ${taskId} failed to generate.`)
            saveTasksLocally()
          }
        } else {
             clearInterval(interval);
             activeTimers.delete(taskId)
        }
      }
    } catch(e) {
      console.error('Polling error', e)
    }
    pollCount++
  }, 3000)
  activeTimers.set(taskId, interval)
}

const saveTasksLocally = () => {
  sessionStorage.setItem('dashboardPptTasks', JSON.stringify(pptTasks.value))
}

const loadTasksLocally = () => {
  try {
    const saved = sessionStorage.getItem('dashboardPptTasks')
    if (saved) {
      const tasks: PPTTask[] = JSON.parse(saved)
      pptTasks.value = tasks
      // 重新开启还没有成功的任务轮询
      tasks.forEach(t => {
        if (t.status === 'PROCESSING' || t.status === 'SUBMITTED') {
          pollTask(t.id)
        }
      })
    }
  } catch(e) {}
}


const generatePPTOutline = async () => {
  if (!pptForm.topic.trim()) {
    ElMessage.warning('Please enter PPT topic')
    return
  }
  generatingOutline.value = true
  pptOutline.value = ''
  try {
    let payload: any;
    if (pptForm.fileList && pptForm.fileList.length > 0) {
      payload = new FormData();
      payload.append('topic', pptForm.topic);
      payload.append('pages', pptForm.pages.toString());
      payload.append('style', pptForm.style);
      payload.append('file', pptForm.fileList[0].raw);
    } else {
      payload = {
        topic: pptForm.topic,
        pages: pptForm.pages,
        style: pptForm.style
      };
    }

    const outlineResponse = await aiGeneratePPTOutlineApi(payload) as any
    if (outlineResponse.code !== 0) {
      ElMessage.error(safeUiError('Failed to generate PPT outline'))
      return
    }
    pptOutline.value = outlineResponse.data.markdownOutline || ''
    pptPagesCount.value = outlineResponse.data.pages || pptForm.pages
    pptTaskStatus.value = 'OUTLINE_GENERATED'
    ElMessage.success('PPT outline generated! Please review and modify it, or click Generate PPT to proceed.')
  } catch (error: any) {
    ElMessage.error(safeUiError('Failed to generate outline'))
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
  pptSyncNotice.value = ''
  try {
    console.log('【调试】第二步：创建 PPT 任务 (Engine: standard)')
    const formData = new FormData()
    formData.append('prompt', "主题：" + pptForm.topic + "\n大纲要求：" + pptOutline.value)
    formData.append('pages', pptForm.pages.toString())
    if (pptForm.style) {
      formData.append('style', pptForm.style)
    }
    if (pptForm.fileList && pptForm.fileList.length > 0) {
      formData.append('file', pptForm.fileList[0].raw)
    }

    const taskResponse = await createPPTTaskApi(formData) as any;

    console.log('【调试】PPT 任务创建响应:', taskResponse)

    if (taskResponse.code !== 0) {
      ElMessage.error(safeUiError('Failed to create PPT task'))
      pptLoading.value = false;
      return
    }

    const taskData = taskResponse.data
    const newTaskId = taskData.recordId
    
    // Add to task list
    const newTask: PPTTask = {
      id: newTaskId,
      topic: pptForm.topic || 'Untitled PPT',
      status: taskData.status || 'SUBMITTED',
      createdAt: Date.now(),
      credits: taskData.credits || { deducted: 0, remaining: 0 },
      personalResourceId: taskData.personalResourceId ?? null,
    }
    pptTasks.value.unshift(newTask)
    saveTasksLocally()

    console.log('【调试】PPT task created，ID:', newTaskId, 'Status:', taskData.status)
    ElMessage.success('PPT task pushed to queue. It will be synced to your personal resource space after completion.')
    
    // Auto-open task list Drawer so user notices
    showTaskList.value = true

    pollTask(newTaskId)

  } catch (error: any) {
    console.error('【调试】创建 PPT 任务失败:', error)
    ElMessage.error('Error occurred while creating PPT task')
  } finally {
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

// 根据选择的班级过滤学生列表
const filteredStudents = computed(() => {
  if (selectedClasses.value.length === 0) {
    return availableStudents.value
  }
  return availableStudents.value.filter(student =>
    student.classIds && student.classIds.some((classId: number) => selectedClasses.value.includes(classId))
  )
})

// 当选择的班级变化时，清理掉不在过滤后列表中的已选学生
watch(selectedClasses, () => {
  if (selectedClasses.value.length > 0) {
    const validStudentIds = filteredStudents.value.map(s => s.id)
    selectedStudents.value = selectedStudents.value.filter(id => validStudentIds.includes(id))
  }
})

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
        ElMessage.error('Failed to generate questions')
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
        ElMessage.warning(`Request timed out, retrying (${retryCount}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delayTime))
        return await attemptGenerate()
      }

      // 最终错误处理
      if (errorStatus === 504) {
        ElMessage.error('Request timed out. Please try again later.')
      } else if (errorMsg.includes('timeout')) {
        ElMessage.error('Request timed out. Please try again later.')
      } else if (errorStatus === 400) {
        ElMessage.error('Invalid request parameters')
      } else if (errorMsg.includes('401') || errorMsg.includes('未登录')) {
        ElMessage.error('Session expired. Please sign in again.')
      } else {
        ElMessage.error('Failed to generate questions')
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
      ElMessage.error('Failed to publish homework')
    }
  } catch (error: any) {
    console.error('Publish homework error:', error)
    ElMessage.error('Failed to publish homework')
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
const uploadCourseId = ref<string>('1')
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
  const firstCourseId = privateFiles.value[0]?.courseId || publicFiles.value[0]?.courseId || 1
  uploadCourseId.value = String(firstCourseId)
  uploadDialogVisible.value = true
}

const confirmUploadResource = async () => {
  if (fileList.value.length === 0) {
    ElMessage.warning('Please select a file')
    return
  }
  if (!String(uploadCourseId.value || '').trim()) {
    ElMessage.warning('Please fill in the course ID')
    return
  }

  uploadingFile.value = true
  try {
    const selectedFile = fileList.value[0]?.raw || fileList.value[0]?.file || fileList.value[0]
    if (!selectedFile) {
      ElMessage.warning('Selected file is invalid, please choose the file again')
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('courseId', String(uploadCourseId.value).trim())
    formData.append('visibility', uploadVisibility.value)
    if (uploadRemark.value) {
      formData.append('remark', uploadRemark.value)
    }

    console.log('[debug] uploadCourseResource payload', {
      courseId: uploadCourseId.value,
      visibility: uploadVisibility.value,
      fileName: selectedFile?.name,
      fileSize: selectedFile?.size,
      fileType: selectedFile?.type,
    })

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

const resourcePage = ref(1)
const resourcePageSize = ref(10)
const resourceTotal = ref(0)

const normalizeResourceRow = (row: any) => ({
  ...row,
  resourceId: Number(
    row?.resourceId ??
      row?.resourceFileId ??
      row?.resource_file_id ??
      row?.personalResourceId ??
      row?.id ??
      row?.resource_id ??
      0,
  ),
  courseId: Number(row?.courseId ?? row?.course_id ?? row?.bizId ?? 0) || row?.courseId,
  originalFilename:
    row?.originalFilename ??
    row?.resultOriginalFilename ??
    row?.sourceOriginalFilename ??
    row?.resultFileOriginalFilename ??
    row?.filename ??
    row?.name ??
    row?.title ??
    '',
  publishStatus: String(row?.publishStatus ?? row?.status ?? 'UNPUBLISHED').toUpperCase(),
  allowPreview: row?.allowPreview ?? true,
  allowDownload: row?.allowDownload ?? true,
  downloadUrl: row?.downloadUrl ?? row?.resultFileUrl ?? row?.remoteDownloadUrl ?? '',
})

const isTeachingResourceRow = (row: any) =>
  String(row?.bizType || '').toUpperCase() === 'TEACHING_RESOURCE' ||
  Boolean(row?.personalResourceId)

const getResourceId = (row: any) => Number(
  row?.resourceId ??
    row?.resourceFileId ??
    row?.resource_file_id ??
    row?.personalResourceId ??
    row?.id ??
    row?.resource_id ??
    0,
)

const getResourceCourseId = (row: any) => Number(row?.courseId ?? row?.course_id ?? 0) || row?.courseId || 1

const isPublicResource = (row: any) => {
  const publishStatus = String(row?.publishStatus || '').toUpperCase()
  return publishStatus === 'PUBLISHED'
}

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
    const pageNoNum = Number(resourcePage.value) || 1
    const pageSizeNum = Number(resourcePageSize.value) || 10
    console.log('[debug] loadResources called', { activeMenu: activeMenu.value, pageNo: pageNoNum, pageSize: pageSizeNum })
    if (isTeacher.value && activeMenu.value === 'file-private') {
      const res = await getResourcePageApi({
        pageNo: pageNoNum,
        pageSize: pageSizeNum,
        bizType: 'TEACHING_RESOURCE',
        bizId: Number(userStore.userInfo?.id || 0) || undefined,
      }) as any
      console.log('[debug] getResourcePageApi response', res)
      if (res.code === 0) {
        privateFiles.value = (res.data.records || []).map(normalizeResourceRow)
        resourceTotal.value = res.data.total || 0
      }
    }
    else if (isTeacher.value && activeMenu.value === 'file-public') {
        const courseId = 1
        const res = await getTeacherCourseResourcePageApi({
          courseId,
          pageNo: pageNoNum,
          pageSize: pageSizeNum
        }) as any
        console.log('[debug] getTeacherCourseResourcePageApi response', res)
        if (res.code === 0) {
          const publicRecords = (res.data.records || [])
            .map(normalizeResourceRow)
            .filter(isPublicResource)
          publicFiles.value = publicRecords
          resourceTotal.value = res.data.total || 0
        }
    }
    else {
      const courseId = 1
      const res = await getStudentCourseResourcePageApi({
        courseId,
        pageNo: pageNoNum,
        pageSize: pageSizeNum
      }) as any
      console.log('[debug] getStudentCourseResourcePageApi response', res)
      if (res.code === 0) {
        publicFiles.value = (res.data.records || []).map(normalizeResourceRow)
        resourceTotal.value = res.data.total || 0
      }
    }
  } catch (error: any) {
    console.error('获取资源列表报错:', error)
  } finally {
    loadingFiles.value = false
  }
}

// Refresh private files explicitly (used when PPT task syncs to personal resource space)
const refreshPrivateFiles = async () => {
  try {
    const teacherId = Number(userStore.userInfo?.id || 0) || undefined

    // Try TEACHING_RESOURCE first per AIPPT doc, fallback to legacy course resource query
    let res = await getResourcePageApi({
      pageNo: 1,
      pageSize: resourcePageSize.value,
      bizType: 'TEACHING_RESOURCE',
      bizId: teacherId,
    }) as any

    if (res && res.code === 0 && res.data) {
      privateFiles.value = (res.data.records || []).map(normalizeResourceRow)
      resourceTotal.value = res.data.total || 0
      return
    }

    res = await getResourcePageApi({
      pageNo: 1,
      pageSize: resourcePageSize.value,
      bizType: 'COURSE_RESOURCE'
    }) as any

    if (res && res.code === 0 && res.data) {
      privateFiles.value = (res.data.records || []).map(normalizeResourceRow)
      resourceTotal.value = res.data.total || 0
    }
  } catch (e) {
    console.error('refreshPrivateFiles error', e)
  }
}

watch(activeMenu, (newVal) => {
  if (newVal === 'file-public' || newVal === 'file-private') {
    resourcePage.value = 1;
    loadResources()
  }
})

const publishFile = async (row: any) => {
  try {
    const resourceId = getResourceId(row)
    const courseId = getResourceCourseId(row)
    const { code, message } = await publishCourseResourceApi({
      resourceId,
      courseId,
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
    const resourceId = getResourceId(row)
    const courseId = getResourceCourseId(row)
    const { code, message } = await revokeCourseResourceApi({
      resourceId,
      courseId,
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
    const resourceId = getResourceId(row)
    const { code, message } = await deleteResourceApi(resourceId) as any
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
    const resourceId = getResourceId(row)
    if (!resourceId) {
      ElMessage.warning('Resource ID not found, cannot preview this file')
      return
    }
    if (row.previewSupported === false) {
      ElMessage.warning(row.previewStatus === 'UNSUPPORTED' ? 'The current file is not supported for online preview' : 'This resource is currently not supported for preview')
      return
    }
    if (row.previewStatus === 'PENDING' || row.previewStatus === 'PROCESSING') {
      ElMessage.warning('The courseware preview file is being generated, please try again later')
      return
    }
    if (row.previewStatus === 'FAILED') {
      ElMessage.warning('课件预览文件生成失败，请稍后重试')
      return
    }

    const isTeacherRole = isTeacher.value

    if (isTeachingResourceRow(row)) {
      const res = await getResourceDownloadUrlApi(resourceId) as any
      if (res.code === 0 && res.data) {
        window.open(res.data, '_blank')
        return
      }
      ElMessage.warning(res.message || 'This file currently does not support direct online preview')
      return
    }

    const res = isTeacherRole
      ? await getTeacherPreviewUrlApi(resourceId) as any
      : await getStudentPreviewUrlApi(resourceId) as any

    if (res.code === 0 && res.data) {
      window.open(res.data, '_blank')
      return
    }

    // Fallback: if preview URL not available, try to open resultFileUrl or download URL
    try {
      if (row.resultFileUrl) {
        window.open(row.resultFileUrl, '_blank')
        return
      }
      if (isTeacherRole && isTeachingResourceRow(row)) {
        try {
          const dlRes = await getResourceDownloadUrlApi(resourceId) as any
          if (dlRes.code === 0 && dlRes.data) {
            window.open(dlRes.data, '_blank')
            return
          }
        } catch (e) {
          console.warn('construct download url failed', e)
        }
      }
    } catch (e) {
      console.warn('preview fallback failed', e)
    }

    ElMessage.warning(res.message || 'This file currently does not support direct online preview')
  } catch (e: any) {
    ElMessage.error('Failed to get preview link')
  }
}

const downloadFile = async (row: any) => {
  const resourceId = getResourceId(row)
  try {
    if (!resourceId) {
      if (row?.downloadUrl) {
        window.open(row.downloadUrl, '_blank')
        return
      }
      ElMessage.warning('Resource ID not found, cannot download this file')
      return
    }

    downloadingIds.value.push(resourceId)
    ElMessage.info('Requesting download, please wait...')

    if (isTeachingResourceRow(row)) {
      const res = await getResourceDownloadUrlApi(resourceId) as any
      if (res.code === 0 && res.data) {
        window.open(res.data, '_blank')
        ElMessage.success('Starting download')
        return
      }
      throw new Error(res.message || 'Failed to get resource download url')
    }

    // Use authenticated blob download so the request carries Authorization automatically.
    const url = isTeacher.value
      ? `/api/resource/course/download?resourceId=${resourceId}`
      : `/api/resource/student/download?resourceId=${resourceId}`

    const response = await service.get(url, { responseType: 'blob' }) as any

    if (response.data && response.data.type === 'application/json') {
      const text = await response.data.text()
      const json = JSON.parse(text)
      throw new Error(json.message || '文件请求验证失败')
    }

    const blob = new Blob([response.data], { type: response.headers['content-type'] })
    const downloadUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl

    let fileName = row.originalFilename || row.downloadFileName || row.resultOriginalFilename
    if (!fileName) {
      const contentDisposition = response.headers['content-disposition']
      fileName = 'download_file'
      if (contentDisposition) {
        const utf8FilenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/) 

        if (utf8FilenameMatch && utf8FilenameMatch.length === 2) {
          fileName = decodeURIComponent(utf8FilenameMatch[1])
        } else if (fileNameMatch && fileNameMatch.length === 2) {
          let rawName = fileNameMatch[1]
          if (rawName.startsWith('=?UTF-8?')) {
            rawName = rawName.replace(/=\?(?:utf-8|UTF-8)\?(?:B|b)\?([A-Za-z0-9+/=]+)\?=/g, (_: string, p1: string) => {
              try { return decodeURIComponent(escape(atob(p1))) } catch (e) { return p1 }
            })
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
    if (row?.downloadUrl) {
      window.open(row.downloadUrl, '_blank')
      return
    }
    ElMessage.error('Download failed, please try again')
  } finally {
    downloadingIds.value = downloadingIds.value.filter(id => id !== resourceId)
  }
}


const getPptPreviewUrl = (url?: string) => {
  if (!url) return '';
  if (url.includes('gamma.app') || url.includes('officeapps.live.com')) return url;
  
  let targetUrl = url;
  if (url.startsWith('/')) {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const base = isLocal ? 'https://cekl.d9lab.net' : window.location.origin;
    targetUrl = base + url;
  } else if (url.includes('localhost') || url.includes('127.0.0.1')) {
    targetUrl = url.replace(/http:\/\/(localhost|127\.0\.0\.1):\d+/, 'https://cekl.d9lab.net');
  }
  
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(targetUrl)}`;
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
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
}
.role-switch {
  padding: 16px;
  text-align: center;
  background-color: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
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
.record-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.record-summary-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.record-summary-title {
  font-weight: 700;
  font-size: 15px;
  line-height: 1.45;
  color: #1f2937;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.record-summary-meta {
  font-size: 12px;
  color: #6b7280;
}
.record-summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.record-summary-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
}
.record-summary-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.record-summary-label {
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}
.record-summary-text {
  font-size: 13px;
  line-height: 1.6;
  color: #4b5563;
  display: -webkit-box;
  line-clamp: 3;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: pre-wrap;
  word-break: break-word;
}
.record-summary-footer {
  font-size: 12px;
  color: #409eff;
  text-align: right;
}
.input-area {
  flex-shrink: 0;
}

:deep(.resource-upload-dialog .el-dialog__body) {
  max-height: calc(100vh - 220px);
  overflow-y: auto;
  overflow-x: hidden;
}

:deep(.resource-upload-dialog .el-upload) {
  width: 100%;
  max-width: 100%;
}

:deep(.resource-upload-dialog .el-upload-dragger) {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
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
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
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
