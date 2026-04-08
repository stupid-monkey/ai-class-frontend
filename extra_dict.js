@
const fs = require('fs');

const extraDict = {
  '输入对学生的评价和改进建议': 'Enter evaluation and suggestions for the student',
  '提交批改': 'Submit Grading',
  '重新批改': 'Regrade',
  '学生提交列表': 'Student Submissions',
  '全部': 'All',
  '已经提交': 'Submitted',
  '已提交': 'Submitted',
  '未提交': 'Not Submitted',
  '学生': 'Student',
  '学号': 'Student ID',
  '知识点': 'Knowledge Point',
  '难度': 'Difficulty',
  '简单': 'Easy',
  '中等': 'Medium',
  '困难': 'Hard',
  '题目数': 'Question Count',
  '提交时间': 'Submission Time',
  '批改时间': 'Grading Time',
  '暂无学生': 'No students',
  '分': 'points',
  '暂无': 'None',
  '选择学生': 'Select student',
  '搜索': 'Search',
};

let content = fs.readFileSync('D:/AiClass/Ai-Class/src/views/TeacherGradingView.vue', 'utf8');
let orig = content;
const keys = Object.keys(extraDict).sort((a,b) => b.length - a.length);

for (let k of keys) {
  content = content.split(k).join(extraDict[k]);
}

if (content !== orig) {
  fs.writeFileSync('D:/AiClass/Ai-Class/src/views/TeacherGradingView.vue', content, 'utf8');
  console.log('Replaced extra UI text in TeacherGradingView.vue');
}
@
