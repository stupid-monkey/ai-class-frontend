<template>
  <div class="base-info-import" style="padding: 20px">
    <el-card class="box-card">
      <template #header>
        <div class="card-header" style="font-weight: bold; font-size: 18px">
          <span>Base Data Import</span>
        </div>
      </template>

      <div
        class="actions-row"
        style="display: flex; align-items: center; margin-bottom: 20px; gap: 10px"
      >
        <el-button type="primary" @click="handleDownload">Download Template</el-button>

        <el-upload
          class="upload-demo"
          action="#"
          :auto-upload="false"
          :on-change="handleFileChange"
          accept=".xlsx"
          :show-file-list="false"
        >
          <el-button type="info">Select File</el-button>
        </el-upload>
        <span v-if="file" class="file-name" style="color: #606266; font-size: 14px"
          >Selected: {{ file.name }}</span
        >

        <el-button
          type="warning"
          :disabled="!file || isValidating || isImporting"
          @click="handleValidate"
          :loading="isValidating"
        >
          Validate File
        </el-button>
        <el-button
          type="success"
          :disabled="!file || !hasValidated || !isValid || isImporting || isValidating"
          @click="handleImport"
          :loading="isImporting"
        >
          Confirm Import
        </el-button>
      </div>

      <div style="margin-bottom: 12px; color: #909399; font-size: 13px">
        Tips: Please keep template sheet names and headers unchanged. Validate first, then import.
      </div>

      <div v-if="stats.length" class="results-section" style="margin-top: 30px">
        <h3 style="margin-bottom: 15px">Statistics</h3>
        <el-table :data="stats" border style="width: 100%">
          <el-table-column prop="sheetName" label="Sheet Name" />
          <el-table-column prop="totalRows" label="Total Rows" />
          <el-table-column prop="successRows" label="Success Rows" />
          <el-table-column prop="failRows" label="Failed Rows" />
        </el-table>
      </div>

      <div v-if="errors.length" class="errors-section" style="margin-top: 30px">
        <h3 style="color: #f56c6c; margin-bottom: 15px">Error Details</h3>
        <el-table :data="errors" border style="width: 100%" stripe type="danger">
          <el-table-column prop="sheetName" label="Sheet" width="150" />
          <el-table-column prop="rowNumber" label="Row No." width="100" />
          <el-table-column prop="fieldName" label="Field Name" width="150" />
          <el-table-column prop="message" label="Error Message" />
        </el-table>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { downloadBaseInfoTemplate, validateBaseInfoFile, importBaseInfoFile } from '@/api/admin'

interface SheetStat {
  sheetName: string
  totalRows: number
  successRows: number
  failRows: number
}

interface ImportErrorItem {
  sheetName: string
  rowNumber: number
  fieldName: string
  message: string
}

interface ImportResult {
  valid: boolean
  imported: boolean
  message: string
  sheetStats: SheetStat[]
  errors: ImportErrorItem[]
}

interface ApiResult<T = any> {
  code: number
  message?: string
  msg?: string
  data: T
}

const file = ref<File | null>(null)
const isValidating = ref(false)
const isImporting = ref(false)
const isValid = ref(false)
const hasValidated = ref(false)
const stats = ref<SheetStat[]>([])
const errors = ref<ImportErrorItem[]>([])

const getErrorMessage = (err: any, fallback: string) => {
  return err?.message || err?.response?.data?.message || err?.response?.data?.msg || fallback
}

const parseFileNameFromHeaders = (headers: any) => {
  const disposition = headers?.['content-disposition'] || headers?.['Content-Disposition'] || ''
  const utf8Matched = disposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Matched?.[1]) {
    try {
      return decodeURIComponent(utf8Matched[1])
    } catch {
      return utf8Matched[1]
    }
  }

  const matched = disposition.match(/filename="?([^";]+)"?/i)
  if (matched?.[1]) return matched[1]

  return 'baseinfo-import-template.xlsx'
}

const normalizeApiResult = <T>(res: any): ApiResult<T> => {
  if (res && typeof res.code !== 'undefined') return res as ApiResult<T>
  if (res?.data && typeof res.data.code !== 'undefined') return res.data as ApiResult<T>
  return {
    code: -1,
    message: 'Invalid response format from server',
    data: {} as T,
  }
}

const handleDownload = async () => {
  try {
    const res = await downloadBaseInfoTemplate()
    const url = window.URL.createObjectURL(
      new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = parseFileNameFromHeaders(res.headers)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success('Template downloaded successfully')
  } catch (err) {
    ElMessage.error(getErrorMessage(err, 'Failed to download template'))
  }
}

const handleFileChange = (uploadFile: any) => {
  file.value = uploadFile?.raw || null
  isValid.value = false
  hasValidated.value = false
  stats.value = []
  errors.value = []
}

const handleValidate = async () => {
  if (!file.value) return
  isValidating.value = true
  const fd = new FormData()
  fd.append('file', file.value)
  try {
    const rawRes = await validateBaseInfoFile(fd)
    const res = normalizeApiResult<ImportResult>(rawRes)

    if (res.code !== 0) {
      ElMessage.error(res.message || res.msg || 'Validation request failed')
      isValid.value = false
      hasValidated.value = false
      return
    }

    const result = res.data || ({} as ImportResult)
    isValid.value = Boolean(result.valid)
    hasValidated.value = true
    stats.value = result.sheetStats || []
    errors.value = result.errors || []

    if (result.valid) {
      ElMessage.success('Validation passed. You can now import.')
    } else {
      ElMessage.warning(result.message || 'Validation failed. Please check the errors below.')
    }
  } catch (err) {
    isValid.value = false
    hasValidated.value = false
    ElMessage.error(getErrorMessage(err, 'Validation process encountered an error'))
  } finally {
    isValidating.value = false
  }
}

const handleImport = async () => {
  if (!file.value || !hasValidated.value || !isValid.value) {
    ElMessage.warning('Please validate the file first, then import')
    return
  }

  isImporting.value = true
  const fd = new FormData()
  fd.append('file', file.value)
  try {
    const rawRes = await importBaseInfoFile(fd)
    const res = normalizeApiResult<ImportResult>(rawRes)

    if (res.code !== 0) {
      ElMessage.error(res.message || res.msg || 'Import request failed')
      return
    }

    const result = res.data || ({} as ImportResult)
    stats.value = result.sheetStats || []
    errors.value = result.errors || []

    if (result.valid && result.imported) {
      ElMessage.success('Import Successful!')
      file.value = null
      isValid.value = false
      hasValidated.value = false
      stats.value = []
      errors.value = []
    } else {
      ElMessage.error(result.message || 'Import failed. Please check validation errors.')
      if (!result.valid) {
        isValid.value = false
      }
    }
  } catch (err) {
    ElMessage.error(getErrorMessage(err, 'Import process encountered an error'))
  } finally {
    isImporting.value = false
  }
}
</script>
