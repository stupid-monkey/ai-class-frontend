<template>
  <div class="base-info-import" style="padding: 20px;">
    <el-card class="box-card">
      <template #header>
        <div class="card-header" style="font-weight: bold; font-size: 18px;">
          <span>Base Data Import</span>
        </div>
      </template>

      <div class="actions-row" style="display: flex; align-items: center; margin-bottom: 20px; gap: 10px;">
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
        <span v-if="file" class="file-name" style="color: #606266; font-size: 14px;">Selected: {{ file.name }}</span>

        <el-button type="warning" :disabled="!file || isValidating" @click="handleValidate" :loading="isValidating">
          Validate File
        </el-button>
        <el-button type="success" :disabled="!isValid || isImporting" @click="handleImport" :loading="isImporting">
          Confirm Import
        </el-button>
      </div>

      <div v-if="stats.length" class="results-section" style="margin-top: 30px;">
        <h3 style="margin-bottom: 15px;">Statistics</h3>
        <el-table :data="stats" border style="width: 100%">
          <el-table-column prop="sheetName" label="Sheet Name" />
          <el-table-column prop="totalRows" label="Total Rows" />
          <el-table-column prop="successRows" label="Success Rows" />
          <el-table-column prop="failRows" label="Failed Rows" />
        </el-table>
      </div>

      <div v-if="errors.length" class="errors-section" style="margin-top: 30px;">
        <h3 style="color: #F56C6C; margin-bottom: 15px;">Error Details</h3>
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
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import { downloadBaseInfoTemplate, validateBaseInfoFile, importBaseInfoFile } from '@/api/admin';

const file = ref<any>(null);
const isValidating = ref(false);
const isImporting = ref(false);
const isValid = ref(false);
const stats = ref<any[]>([]);
const errors = ref<any[]>([]);

const handleDownload = async () => {
  try {
    const res = await downloadBaseInfoTemplate();
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'baseinfo-import-template.xlsx';
    link.click();
  } catch (err) {
    ElMessage.error('Failed to download template.');
  }
};

const handleFileChange = (uploadFile: any) => {
  file.value = uploadFile.raw;
  isValid.value = false;
  stats.value = [];
  errors.value = [];
};

const handleValidate = async () => {
  if (!file.value) return;
  isValidating.value = true;
  const fd = new FormData();
  fd.append('file', file.value);
  try {
    const res = await validateBaseInfoFile(fd);
    isValid.value = res.data?.data?.valid || false;
    stats.value = res.data?.data?.sheetStats || [];
    errors.value = res.data?.data?.errors || [];
    if (isValid.value) {
      ElMessage.success('Validation passed. You can now import.');
    } else {
      ElMessage.warning('Validation failed. Please check the errors below.');
    }
  } catch (err) {
    ElMessage.error('Validation process encountered an error.');
  } finally {
    isValidating.value = false;
  }
};

const handleImport = async () => {
  if (!file.value) return;
  isImporting.value = true;
  const fd = new FormData();
  fd.append('file', file.value);
  try {
    const res = await importBaseInfoFile(fd);
    if (res.data?.data?.imported) {
      ElMessage.success('Import Successful!');
      file.value = null; // reset
      isValid.value = false;
    } else {
      ElMessage.error('Import Failed. Please check the details.');
    }
    stats.value = res.data?.data?.sheetStats || [];
    errors.value = res.data?.data?.errors || [];
  } catch (err) {
    ElMessage.error('Import process encountered an error.');
  } finally {
    isImporting.value = false;
  }
};
</script>