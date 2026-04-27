const fs = require('fs');
let file = fs.readFileSync('src/views/DashboardView.vue', 'utf8');

const regexLeft = /<el-form-item :label="\$t\('dashboard_mod\.designStyle'\)">[\s\S]*?<el-select v-model="pptForm\.style"[\s\S]*?<\/el-select>.*?<\/el-form-item>[\s\S]*?<el-button[\s\S]*?@click="generatePPT"[\s\S]*?<\/el-button>[\s\S]*?<\/el-form>/m;

const newLeft = `<el-form-item :label="$t('dashboard_mod.designStyle')">
                      <el-select v-model="pptForm.style" :placeholder="$t('dashboard_mod.selectStyle')" style="width: 100%;">
                        <el-option :label="$t('dashboard_mod.styleAcademic')" value="simple" />
                        <el-option :label="$t('dashboard_mod.styleCartoon')" value="cartoon" />
                        <el-option :label="$t('dashboard_mod.styleTech')" value="tech" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="AI Engine (\u6A21\u578B)">
                      <el-radio-group v-model="pptForm.engine" style="width: 100%; display: flex;">
                        <el-radio-button label="xunfei" style="flex: 1; text-align: center;">Xunfei (Fast)</el-radio-button>
                        <el-radio-button label="gamma" style="flex: 1; text-align: center;">Gamma (Smart)</el-radio-button>
                      </el-radio-group>
                    </el-form-item>
                    
                    <el-button 
                      v-if="!pptOutline && pptTaskStatus !== 'PROCESSING' && pptTaskStatus !== 'SUBMITTED'"
                      type="primary" 
                      size="large" 
                      style="width: 100%; margin-top: 10px;"
                      @click="generatePPTOutline"
                      :loading="generatingOutline"
                      :disabled="generatingOutline"
                    >
                      {{ generatingOutline ? '\u23F3 Generating Outline...' : '\uD83D\uDCDD Generate PPT Outline' }}
                    </el-button>
                    
                    <div v-if="pptOutline || pptTaskStatus === 'PROCESSING' || pptTaskStatus === 'SUBMITTED'" style="margin-top: 15px; border-top: 1px solid #ebeef5; padding-top: 15px;">
                      <el-button 
                        type="success" 
                        size="large" 
                        style="width: 100%;"
                        @click="generatePPT"
                        :loading="pptLoading"
                        :disabled="pptLoading"
                      >
                        {{ pptLoading ? '\u23F3 ' + $t('dashboard_mod.generating') : '\uD83D\uDE80 Generate Final PPT' }}
                      </el-button>
                      
                      <div v-if="pptOutline && (!pptLoading || (pptTaskStatus !== 'PROCESSING' && pptTaskStatus !== 'SUBMITTED'))" style="margin-top: 10px; text-align: center;">
                         <el-button link type="info" @click="pptOutline = ''; pptTaskStatus = ''">\uD83D\uDDD1\uFE0F Reset & Restart</el-button>
                      </div>
                    </div>
                  </el-form>`;

const regexRight = /<!-- 大纲展示 -->[\s\S]*?<div v-else-if="pptOutline" class="preview-box"[\s\S]*?📄 PPT outline \({{ pptPagesCount }} 页\)<\/div>[\s\S]*?<el-text style="white-space: pre-wrap;">{{ pptOutline }}<\/el-text>[\s\S]*?<\/div>/m;

const newRight = `<!-- 大纲展示 (可编辑) -->
                  <div v-else-if="pptOutline" class="preview-box" style="background-color: #ffffff; padding: 15px; border-radius: 4px; border: 1px solid #dcdfe6; display: flex; flex-direction: column; height: 100%; min-height: 400px;">
                    <div style="margin-bottom: 10px; color: #409EFF; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                      <span>\uD83D\uDCC4 PPT Outline ({{ pptPagesCount }} Pages)</span>
                      <el-tag size="small" type="warning">Editable outline before Generation</el-tag>
                    </div>
                    <el-input
                      v-model="pptOutline"
                      type="textarea"
                      placeholder="Review and modify your outline here before generating the final PPT..."
                      style="flex-grow: 1;"
                      :input-style="{ height: '100%', minHeight: '350px', resize: 'none', padding: '10px' }"
                    />
                  </div>`;

let changed = false;
if (regexLeft.test(file)) {
    file = file.replace(regexLeft, newLeft);
    console.log('Replaced left form');
    changed = true;
} else {
    console.log('Left form regex failed');
}

if (regexRight.test(file)) {
    file = file.replace(regexRight, newRight);
    console.log('Replaced right format');
    changed = true;
} else {
    console.log('Right form regex failed');
}

if (changed) fs.writeFileSync('src/views/DashboardView.vue', file);
