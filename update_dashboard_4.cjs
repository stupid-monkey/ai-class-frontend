const fs = require('fs');

const filePath = 'src/views/DashboardView.vue';
let content = fs.readFileSync(filePath, 'utf-8');

const t2 = `</el-table>`;
const t3 = `</el-table>
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

let idx = 0;
while (true) {
  let searchIdx = content.indexOf(t2, idx);
  if (searchIdx === -1) break;
  // Make sure it's inside public or private files area
  let earlierText = content.substring(Math.max(0, searchIdx - 2000), searchIdx);
  if (earlierText.includes('publicFiles') || earlierText.includes('privateFiles')) {
      content = content.substring(0, searchIdx) + t3 + content.substring(searchIdx + t2.length);
      idx = searchIdx + t3.length;
  } else {
      idx = searchIdx + t2.length;
  }
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Tables updated.');
