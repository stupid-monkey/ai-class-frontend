const fs = require('fs');

const filePath = 'src/views/DashboardView.vue';
let content = fs.readFileSync(filePath, 'utf-8');

// I will find the privateFiles table and insert pagination.
const tblStart = '<el-table :data="privateFiles"';
const tblEndIdx = content.indexOf('</el-table>', content.indexOf(tblStart));

if (tblEndIdx !== -1) {
  let afterStr = content.substring(tblEndIdx + '</el-table>'.length);
  // Check if it already has pagination right after
  if (!afterStr.trim().startsWith('<div') || !afterStr.includes('resourcePage')) {
    const newTblStr = `</el-table>
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
    content = content.substring(0, tblEndIdx) + newTblStr + afterStr;
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Pagination appended to privateFiles table.');
  } else {
    console.log('Pagination already there for privateFiles table.');
  }
} else {
  console.log('table boundary not found');
}
